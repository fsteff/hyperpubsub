const {createMany} = require('hyperspace/test/helpers/create')
const tape = require('tape')
const PubSub = require('./')

tape('basic', async t => {
    t.plan(1)
    t.timeoutAfter(15000)

    const {clients, servers, cleanup} = await createMany(2)

    try {
        await Promise.all(servers.map(s => s.ready()))
        await Promise.all(clients.map(c => c.ready()))
        const pubsub1 = new PubSub(clients[0].network, {application: 'test', onError})
        const pubsub2 = new PubSub(clients[0].network, {application: 'test', onError})
        await Promise.all([
            pubsub1.join('topic'), 
            pubsub2.join('topic'), 
            new Promise((resolve) => {
                clients[0].network.once('peer-add', resolve)
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
        t.fail(err)
        cleanup()
        throw err
    }
})