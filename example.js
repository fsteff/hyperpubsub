const {PubSub} = require('.').debug() // call debug() if you want debugging messages printed to the cli
const simulator = require('hyperspace/simulator')

console.log('booting up hyperspace simulator...')
simulator().then(async ({client}) => {
  const pubsub = new PubSub(client.network, {application: 'example app', onError: console.error})
  console.log('subscribing topic')
  pubsub.sub('some topic', (msg, app) => console.log(msg.toString('utf-8')), true) // messages are binary blobs
    
  setInterval(send, 1000)
  function send() {
    pubsub.pub('some topic', Buffer.from('hello', 'utf-8'))
  }
})
