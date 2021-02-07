const simulator = require('hyperspace/simulator')
const PubSub = require('./')

const remote = process.argv.length > 2 ? process.argv[2] : null

simulator().then(start).catch(err => console.error(err))
async function start({client, cleanup}) {
    const pubsub = new PubSub(client.network)
    
    client.network.on('peer-add', peer => console.log('connected to peer: ' + peer.remoteAddress))

    console.log('joining the network...')
    pubsub.join('test').then(key => console.log('successfully joined the dht at topic hyper://' + key))

    if(remote) {
        await new Promise(resolve => {
            console.log('listening to remote topic')
            pubsub.sub('test', data => {
                const msg = data.toString('utf-8')
                console.log(msg)
                resolve()
            })
        })
    } else {
        while (true) {
            pubsub.pub('test', Buffer.from('hello world!', 'utf-8'))
            //console.log('published msg')
            await new Promise(resolve => setTimeout(resolve, 1000))
        } 
    }
    cleanup()
}