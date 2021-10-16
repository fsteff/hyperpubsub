const {PubSub} = require('..')//.debug() // call debug() if you want debugging messages printed to the cli
const simulator = require('hyperspace/simulator')
const sodium = require('sodium-universal')
const os = require('os')

console.log('# HyperPubSub private message example')
console.log('# Usage: start this script on one device, copy the public key to the other and start the script on the other device with this key as argument')

simulator().then(async ({client}) => {
  const pubsub = new PubSub(client.network, {application: 'example app', onError: console.error})

  const publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
  const secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_box_keypair(publicKey, secretKey)
  console.log('Public Key is: ' + publicKey.toString('hex'))

  pubsub.subPrivateMsg(publicKey, secretKey, (msgBuf, app, peer) => {
    console.log('received "' + msgBuf.toString('utf-8') + '" from ' + peer.remoteAddress)
  }, true)
  
  if(process.argv.length > 2) {
    const otherPubKey = Buffer.from(process.argv[2], 'hex')
    const msg = Buffer.from('hello from ' + os.userInfo().username + ' @ ' + os.hostname, 'utf-8')
    await pubsub.joinPublicKey(otherPubKey)

    send()
    setInterval(send, 1000)

    function send() {
        console.log('sending message: "' + msg.toString('utf-8')+'"')
        pubsub.pubPrivateMsg(otherPubKey, msg)
    }
  }
})
