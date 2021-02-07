const simulator = require('hyperspace/simulator')
const PubSub = require('./')

const remote = process.argv.length > 2 ? process.argv[2] : null

simulator().then(start).catch(err => console.error(err))
async function start({client, cleanup}) {
    const pubsub = new PubSub(client.network)

    if(remote) {
        await new Promise(resolve => {
            console.log('listening to remote topic ' + remote)
            pubsub.sub('test', data => {
                const msg = data.toString('utf-8')
                console.log(msg)
                resolve()
            })
        })
    } else {
        console.log('joining the network...')
        const key = await pubsub.join('test')
        console.log('successfully joined the dht at topic hyper://' + key)
        while (true) {
            pubsub.pub('test', Buffer.from('hello world!', 'utf-8'))
            //console.log('published msg')
            await new Promise(resolve => setTimeout(resolve, 1000))
        } 
    }
    cleanup()
}