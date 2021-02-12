const simulator = require('hyperspace/simulator')
const {PubSub} = require('./').debug()
const sodium = require('sodium-universal')

const remote = process.argv.length > 2 ? process.argv[2] : null
const discoveryKey = hash('test discovery key')

simulator().then(start)
async function start({client, cleanup}) {
    const pubsub = new PubSub(client.network)
    pubsub.on('error', err => console.error(err))
    
    client.network.on('peer-add', peer => console.log('connected to peer: ' + peer.remoteAddress))

    console.log('joining the network...')
    pubsub.join('test').then(key => console.log('successfully joined the dht at topic hyper://' + key))
    
    const pex = pubsub.pex(1000, !remote)
    pex.on('peer-received', (discoveryKey, peer) => console.log('received peer: ' + peer.remoteAddress + ' for discovery key ' + discoveryKey.toString('hex')))
    if(remote) {
        pex.lookup(discoveryKey)
        await new Promise(resolve => {
            console.log('listening to remote topic')
            pubsub.sub('test', data => {
                const msg = data.toString('utf-8')
                console.log(msg)
                resolve()
            })
        })
    } else {
        pex.announce(discoveryKey)
        while (true) {
            //pubsub.pub('test', Buffer.from('hello world!', 'utf-8'))
            await new Promise(resolve => setTimeout(resolve, 1000))
        } 
    }
    cleanup()
}

function hash(txt) {
    const buf = Buffer.from(txt, 'utf-8')
    const digest = Buffer.allocUnsafe(32)
    sodium.crypto_generichash(digest, buf)
    return digest
}