const { PexBatch } = require('./messages')
const EventEmitter = require('events')

const MAX_AGE = 600
const MAX_PEERS = 50

class PeerExchange extends EventEmitter {
    /**
     * @param {import('./')} pubsub 
     */
    constructor(pubsub, maxSize, anytopic = false) {
        super()
        this.pubsub = pubsub
        this.peers = new PeerDict(maxSize || 1000)
        /** @type {Array<Buffer>} */
        this.topics = []
        this.anytopic = !!anytopic

        if (this.anytopic) pubsub.sub('pex', (msg, app, peer) => this._onMessage(msg, peer), false)

        pubsub.on('subscriber-add', (topic, peer) => this._sendPeers(topic, peer))
        pubsub.on('subscriber-remove', (topic, peer) => this.peers.peerUnsubscribed(peer))
    }

    announce(discoveryKey) {
        this.pubsub.pub(toTopic(discoveryKey), encode({ discoveryKey }))
        this.pubsub.pub('pex', encode({ discoveryKey }))
    }

    lookup(discoveryKey) {
        this.pubsub.sub(toTopic(discoveryKey), (msg, app, peer) => this._onMessage(msg, peer), false)
        this.topics.push(discoveryKey)
    }

    unannounce(discoveryKey) {
        this.pubsub.unsub(toTopic(discoveryKey))
        this.topics = this.topics.filter(t => !t.equals(discoveryKey))
    }

    close() {
        this.topics.forEach(t => this.pubsub.unsub(toTopic(discoveryKey)))
        this.topics = null
        this.peers = null
        this.pubsub.peerExchange = null
    }

    _onMessage(msg, peer) {
        try{
            const messages = decode(msg)
            if(messages.length > MAX_PEERS + 10) {
                // likely trying to DoS us
                return this.emit('error', new Error('peer sent ' + messages.length + 'messages, dropping that'))
            }
            for (const pex of messages) {
                // sanity checks (TODO: more)
                if(! Buffer.isBuffer(pex.discoveryKey) || pex.discoveryKey.length !== 32) {
                    console.warn('received PEX peer didn`t pass sanity check (discovery key of length ' + pex.discoveryKey.length + ')')
                    continue
                }

                const directConnection = !pex.address
                if (directConnection) {
                    pex.address = peer.remoteAddress
                    pex.publicKey = peer.remotePublicKey
                }

                this.peers.add(pex, directConnection)

                this.emit('peer-received', pex.discoveryKey, {remoteAddress: pex.address, remotePublicKey: pex.publicKey})

                if(this.anytopic) {
                    const recvTopic = toTopic(pex.discoveryKey)
                    const mytopics = [...this.pubsub.topics.keys()].filter(t => t.startsWith('pex'))
                    if(!mytopics.includes(recvTopic)) {
                        this.pubsub.sub(recvTopic, (msg, app, peer) => this._onMessage(msg, peer), false)
                    }
                }
            }
        } catch (err) {
            this.emit('error', err)
        }
    }

    _sendPeers(topic, peer) {
        if(topic === 'pex') {
            const myTopics = this.topics.map(discoveryKey => {return {discoveryKey}})
            this.pubsub.pub('pex', encode(myTopics), peer)
        } else {
            const discoveryKey = toDiscoveryKey(topic)
            const peers = this.peers.get(discoveryKey)
            if(this.topics.findIndex(t => t.equals(discoveryKey)) >= 0) {
                peers.push({discoveryKey})
            }
    
            if (peers.length > 0) {
                const msg = encode(peers)
                this.pubsub.pub(topic, msg, peer)
            }
        }
    }
}

class Peer {
    constructor(peer, directConnection = false) {
        this.remoteAddress = peer.remoteAddress
        this.remotePublicKey = peer.remotePublicKey
        this.lastSeen = directConnection ? (peer.lastSeen || Date.now()) : null
        this.topics = new Set()
        this.topics.add(toTopic(peer.discoveryKey))
    }

    seen(discoveryKey) {
        if (Buffer.isBuffer(discoveryKey)) discoveryKey = toTopic(discoveryKey)
        this.topics.add(discoveryKey)

        if (this.lastSeen !== null) this.lastSeen = Date.now()
    }

    toMessage(discoveryKey) {
        return {
            discoveryKey,
            address: this.remoteAddress,
            publicKey: this.remotePublicKey,
            lastSeen: this.time()
        }
    }

    unsubscribed() {
        this.lastSeen = Date.now()
    }

    time() {
        return (this.lastSeen || Date.now()) / 1000
    }
}

class PeerDict {
    constructor(maxSize) {
        /** @type {Array<Peer>} */
        this.peers = []
        this.maxSize = maxSize
    }

    add(peerMsg, directConnection = false) {
        const peer = this.peers.find(p => p.remoteAddress === peerMsg.remoteAddress)
        if (peer) peer.seen(peerMsg.discoveryKey)
        else this.peers.push(new Peer(peerMsg, directConnection))

        if (this.peers.length > this.maxSize) this.prune()
    }

    get(discoveryKey) {
        this.prune()

        const peers = this.peers.filter(p => p.topics.has(discoveryKey))
        if (peers.length > MAX_PEERS) peers.splice(MAX_PEERS)
        return peers.map(p => p.toMessage(discoveryKey))
    }

    prune() {
        const now = Date.now() / 1000
        this.peers = this.peers.filter(p => now - p.time() < MAX_AGE)

        if (this.peers.length > this.maxSize) {
            console.log(`peer dict pruning insufficient, randomly remove not directly connected peers (${this.peers.length}/${this.maxSize})`)

            for (let i = 0; i < this.peers.length - this.peers.maxSize; i++) {
                // randomly delete peers that are not directly connected
                const rand = Math.floor(Math.random() * this.peers.length)
                if (this.peers[rand].lastSeen !== null) this.peers.splice(rand, 1)
            }
        }

        // in case that didn't help just cut the rest away
        if (this.peers.length > this.maxSize) {
            console.warn(`random peer dict pruning insufficient, dropping the rest (${this.peers.length}/${this.maxSize})`)
            this.peers.splice(this.maxSize)
        }
    }

    peerUnsubscribed(peer) {
        const p = this.peers.find(p => p.remoteAddress === peer.remoteAddress)
        if (p) p.unsubscribed()
    }
}

function toTopic(discoveryKey) {
    return 'pex.' + (Buffer.isBuffer(discoveryKey) ? discoveryKey.toString('hex') : discoveryKey)
}

function toDiscoveryKey(topic) {
    const hex = topic.substr(4)
    return Buffer.from(hex, 'hex')
}

function encode(messages) {
    if (!Array.isArray(messages)) messages = [messages]
    return PexBatch.encode({ messages })
}

/**
 * @param {Buffer} binary
 * @returns {Array<{discoveryKey: Buffer, address?: string, publicKey?: Buffer}>} 
 */
function decode(binary) {
    const batch = PexBatch.decode(binary)
    return batch.messages
}

module.exports = PeerExchange