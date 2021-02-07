# hyperpubsub
Hypercore Protocol Extension for a simple PubSub system. Works on the top any hyperspace swarm connection.
A peer can notify others that it listens to a specific topic, these then can send them messages regarding that topic.
In addition to that, the peer announces itself to listen to a topic on the hyperswarm DHT, so the PubSub system also works without any existing connection.

It is designed to be used with a [hyperspace](https://github.com/hypercore-protocol/hyperspace-client) RPC client, but might also work directly with a corestore networker (untested).

Here's an [example](https://github.com/fsteff/hyperpubsub/blob/main/example.js).

## API

```javascript
const PubSub = require('hyperpubsub')

// ... set up or connect to a hyperspace instance
// client = a hyperspace client

const pubsub = new PubSub(client.network, {application: 'example app', onError: <somehowhandlethaterror>})
pubsub.join('some topic') // returns Promise<string> of the discovery key used for the dht
pubsub.sub('some topic', (msg, app) => console.log(msg.toString('utf-8'))) // messages are binary blobs
pubsub.pub('some topic', Buffer.from('hello', 'utf-8')) // sends message to all known listening peers
pubsub.unsub('some topic') // no longer interested
pubsub.close() // cleanup
```