# hyperpubsub
Hypercore Protocol Extension for a simple PubSub system. Works on the top any hyperspace swarm connection.
A peer can notify others that it listens to a specific topic, these then can send them messages regarding that topic.
In addition to that, the peer announces itself to listen to a topic on the hyperswarm DHT, so the PubSub system also works without any existing connection.

It is designed to be used with a [hyperspace](https://github.com/hypercore-protocol/hyperspace-client) RPC client, but might also work directly with a corestore networker (untested).

## Install

``` 
npm install hyperpubsub
```

## API

The message format is binary, so if objects are sent they have to be encoded/decoded manually.

```javascript
const {PubSub} = require('hyperpubsub').debug() // call debug() if you want debugging messages printed to the cli

// ... set up or connect to a hyperspace instanced
// client = a hyperspace client
// see https://hypercore-protocol.org/guides/getting-started/hyperspace/

const pubsub = new PubSub(client.network, {application: 'example app', onError: <somehowhandlethaterror>})
pubsub.join('some topic') // returns Promise<string> of the discovery key used for the dht
pubsub.sub('some topic', (msg, app) => console.log(msg.toString('utf-8'))) // messages are binary blobs
pubsub.pub('some topic', Buffer.from('hello', 'utf-8')) // sends message to all known listening peers
pubsub.unsub('some topic') // no longer interested
pubsub.close() // cleanup
```

[example.js](https://github.com/fsteff/hyperpubsub/blob/main/example.js) is a minimalistic demonstrator that uses the hyperspace [simulator](https://github.com/hypercore-protocol/hyperspace#simulator) for local tests.
If started twice you can see it exchanging "hello" messages.

## Private Messges

As of 1.2.0 hyperpubsub also supports private, encrypted messages (utilizing libsodium sealed boxes).
The (hash of the) public key of the receiver serves as the pubsub topic, the rest is very similar to "normal" pubsub.

```javascript
// the key pair has to be set up using libsodium
const sodium = require('sodium-universal')
const publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
const secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
sodium.crypto_box_keypair(publicKey, secretKey)

// subscribe to private messages
pubsub.subPrivateMsg(publicKey, secretKey, (msg) => {
 // process message
})

// send private messages
pubsub2.pubPrivateMsg(publicKey, Buffer.from('hello', 'utf-8'))
```

## TODO
- [ ] PEX is WIP
  - [ ] Hyperspace integration
- [ ] Denial-of-Service and spam protections
