# hyperpubsub
Hypercore Protocol Extension for a simple PubSub system. Works on the top any hyperspace swarm connection.
A peer can notify others that it listens to a specific topic, these then can send them messages regarding that topic.
In addition to that, the peer announces itself to listen to a topic on the hyperswarm DHT, so the PubSub system also works without any existing connection.

It is designed to be used with a [hyperspace](https://github.com/hypercore-protocol/hyperspace-client) RPC client, but might also work directly with a corestore networker (untested).

Here's an [example](https://github.com/fsteff/hyperpubsub/blob/main/example.js).

## Install

``` 
npm install hyperpubsub
```

## API

The message format is binary, so if objects are sent they have to be encoded/decoded manually.

```javascript
const {PubSub} = require('hyperpubsub').debug() // call debug() if you want debugging messages printed to the cli

// ... set up or connect to a hyperspace instance
// client = a hyperspace client

const pubsub = new PubSub(client.network, {application: 'example app', onError: <somehowhandlethaterror>})
pubsub.join('some topic') // returns Promise<string> of the discovery key used for the dht
pubsub.sub('some topic', (msg, app) => console.log(msg.toString('utf-8'))) // messages are binary blobs
pubsub.pub('some topic', Buffer.from('hello', 'utf-8')) // sends message to all known listening peers
pubsub.unsub('some topic') // no longer interested
pubsub.close() // cleanup
```

## Peer Exchange (WIP)

As of 1.1.0 hyperpubsub also supports a *gossip* peer exchange protocol that uses pubsub for exchanging known peers - but the integration into hyperspace is still TBD(!)
It can be configured to accumulate knowledge of all discovery keys the peers are looking for or announcing - effectively serving as a tracker server.
The list of peers also keeps track of the time a peer was last seen and discards peers that haven't been seen for > 10mins.
The number of peers to keep track of is limited - once that is reached, older peers are randomly removed from the list.

```javascript
const pex = pubsub.pex(1000 /* max. number of peers to keep track of */, false /* true means tracker-mode */)
pex.announce(discoveryKey) // announce yourself to a discovery key
pex.lookup(discoveryKey) // "ask" others to send them their peers for that discovery key 
```

## TODO
- [ ] Hyperspace integration
- [ ] Denial-of-Service and spam protections
