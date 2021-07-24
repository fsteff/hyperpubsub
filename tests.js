const {createMany} = require('hyperspace/test/helpers/create')
const tape = require('tape')
const {PubSub} = require('./').debug()
const sodium = require('sodium-universal')

tape('basic', async t => {
    t.plan(1)

    const {clients, servers, cleanup} = await createMany(2)

    try {
        await Promise.all(servers.map(s => s.ready()))
        await Promise.all(clients.map(c => c.ready()))
        const pubsub1 = new PubSub(clients[0].network, {application: 'test', onError})
        const pubsub2 = new PubSub(clients[0].network, {application: 'test', onError})
        await Promise.all([
            pubsub1.join('topic', {announce: true, lookup: true, flush: true}), 
            pubsub2.join('topic', {announce: false, lookup: true, flush: true}), 
            new Promise((resolve) => {
                clients[0].network.once('peer-open', resolve)
            })
        ])

        await pubsub2.sub('topic', msg => {
            t.same(msg.toString('utf-8'), 'hello world')
            cleanup()
        })

        pubsub1.pub('topic', Buffer.from('hello world', 'utf-8'))
    } catch (err) {
        onError(err)
    }

    function onError(err) {
        cleanup()
        t.fail(err)
        throw err
    }
})

tape('private messages', async t => {
    t.plan(1)
    
    const {clients, servers, cleanup} = await createMany(2)

    try {
        await Promise.all(servers.map(s => s.ready()))
        await Promise.all(clients.map(c => c.ready()))
        const pubsub1 = new PubSub(clients[0].network, {application: 'test', onError})
        const pubsub2 = new PubSub(clients[1].network, {application: 'test', onError})

        const publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
        const secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
        sodium.crypto_box_keypair(publicKey, secretKey)

        await Promise.all([
            pubsub1.joinPublicKey(publicKey), 
            pubsub2.joinPublicKey(publicKey), 
            new Promise((resolve) => {
                clients[0].network.once('peer-open', resolve)
            })
        ])

        pubsub1.subPrivateMsg(publicKey, secretKey, (msg) => {
            t.same(msg.toString('utf-8'), 'hello')
            cleanup()
        })

        pubsub2.pubPrivateMsg(publicKey, Buffer.from('hello', 'utf-8'))

    } catch (err) {
        onError(err)
    }

    function onError(err) {
        t.fail(err)
        cleanup()
        throw err
    }
})