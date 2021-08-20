const { PubSubMessage } = require('./messages')
const sodium = require('sodium-universal')
const PeerExchange = require('./pex')
const EventEmitter = require('events')

const MSG_TYPE_SUBSCRIBE = 1
const MSG_TYPE_UNSUBSCRIBE = 2
const MSG_TYPE_MESSAGE = 3

let debug = msg => {}

class PubSub extends EventEmitter {

    constructor(network, opts) {
        super()
        this.opts = opts || {}
        this.subscribers = new Map()
        this.network = network
        this.topics = new Map()
        this.peerExchange = null
        this.listeners = new Map()
        this.extension = this.network.registerExtension({
            name: 'hyperpubsub',
            onmessage: (msg, peer) => this._onMessage(msg, peer),
            encoding: PubSubMessage,
            onerror: err => this.emit('error', err)
        })

        this.network.on('peer-add', peer => {
            debug('peer-add ' + peer.remoteAddress)
            for (const topic of this.topics.keys()) {
                debug('<- sub ' + topic + ' to ' + peer.remoteAddress)
                this.extension.send({ topic, type: MSG_TYPE_SUBSCRIBE, application: this.opts.application }, peer)
            }
        })

        this.network.on('peer-remove', peer => {
            debug('peer-remove ' + peer.remoteAddress)
            for (const topic of this.subscribers.keys()) {
                this._removePeer(peer, topic)
            }
        })
    }

    sub(topic, handler, announce = true) {
        this.topics.set(topic, handler)

        if (announce) {
            this.join(topic)
                .then(() => {
                    debug('<- sub ' + topic + ' broadcast')
                    this.extension.broadcast({ topic, type: MSG_TYPE_SUBSCRIBE, application: this.opts.application })
                })
                .catch(err => {
                    this.emit('error', err)
                })
        } else {
            debug('<- sub ' + topic + ' broadcast')
            this.extension.broadcast({ topic, type: MSG_TYPE_SUBSCRIBE, application: this.opts.application })
        }
    }

    pub(topic, message, peer = null) {
        const self = this
        if (peer) {
            send(peer)
        } else {
            const peers = this.subscribers.get(topic) || []
            peers.forEach(p => send(p))
        }

        function send(to) {
            debug('<- msg ' + topic + ' to ' + to.remoteAddress)
            self.extension.send({ topic, type: MSG_TYPE_MESSAGE, application: self.opts.application, data: message }, to)
        }
    }

    unsub(topic) {
        this.topics.delete(topic)
        debug('<- unsub ' + topic + ' broadcast')
        this.extension.broadcast({ topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application })
    }

    close() {
        this.extension.destroy()
        delete this.topics
        delete this.subscribers
    }

    join(topic, opts = { lookup: true, announce: true, flush: true, remember: false }) {
        const discoveryKey = hash('hyperpubsub.' + topic)
        return this.network.configure(discoveryKey, opts)
            .then(() => debug('joined topic "' + topic + '" (' + discoveryKey.toString('hex') + ')'))
            .then(() => discoveryKey.toString('hex'))
    }

    _onMessage(msg, peer) {
        try {
            switch (msg.type) {
                case MSG_TYPE_SUBSCRIBE:
                    debug('-> msg sub ' + msg.topic + ' from ' + peer.remoteAddress)
                    this._addPeer(peer, msg.topic)
                    break

                case MSG_TYPE_UNSUBSCRIBE:
                    debug('-> msg unsub ' + msg.topic + ' from ' + peer.remoteAddress)
                    this._removePeer(peer, msg.topic)
                    break

                case MSG_TYPE_MESSAGE:
                    const content = msg.data ? msg.data.toString('utf-8') : ''
                    debug('-> msg data ' + msg.topic + ' from ' + peer.remoteAddress)
                    const handler = this.topics.get(msg.topic)
                    if (handler) {
                        handler(msg.data, msg.application, peer)
                    } else {
                        this.emit('error', new Error('no handler found for topic ' + topic))
                        this.extension.send({ topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application }, peer)
                    }
                    break

                default:
                    throw new Error('Invalid PubSub message type: ' + msg.type)
            }
        } catch (err) {
           this.emit('error', err)
        }
    }

    _addPeer(peer, topic) {
        let peers = []
        if (this.subscribers.has(topic)) peers = this.subscribers.get(topic)
        else this.subscribers.set(topic, peers)

        if (!peers.find(p => p.remoteAddress === peer.remoteAddress)) {
            peers.push(peer)
            debug('subscriber ' + peer.remoteAddress + ' added to topic ' + topic)
            this.emit('subscriber-add', topic, peer)
        }
    }

    _removePeer(peer, topic) {
        if (this.subscribers.has(topic)) {
            const peers = this.subscribers.get(topic)
            const idx = peers.findIndex(p => p.remoteAddress === peer.remoteAddress)
            if (idx >= 0) {
                peers.splice(idx, 1)
                debug('subscriber ' + peer.remoteAddress + ' removed from topic ' + topic)
                this.emit('subscriber-remove', topic, peer)
            }
        }
    }

    pex(maxSize = 1000, anytopic = false) {
        if (!this.peerExchange) {
            this.peerExchange = new PeerExchange(this, maxSize, anytopic)
            this.peerExchange.on('error', err => this.emit('error', err))
        }
        return this.peerExchange
    }

    pubPrivateMsg(recipientPubKey, message, peer = null) {
        const ciphertext = privateMessageSeal(message, recipientPubKey)
        const topic = hash(recipientPubKey).toString('hex')
        this.pub(topic, ciphertext, peer)
    }

    subPrivateMsg(publicKey, secretKey, handler, announce = true) {
        const topic = hash(publicKey).toString('hex')
        this.sub(topic, onData, announce)

        function onData(data, app, peer) {
            const msg = privateMessageOpen(data, publicKey, secretKey)
            if(msg) handler(msg, app, peer)
        }
    }

    joinPublicKey(publicKey, opts = { lookup: true, announce: true, flush: true, remember: false }) {
        const topic = hash(publicKey).toString('hex')
        return this.join(topic, opts)
    }
}

function hash(txt) {
    const buf = typeof txt === 'string' ? Buffer.from(txt, 'utf-8') : Buffer.from(txt)
    const digest = Buffer.allocUnsafe(32)
    sodium.crypto_generichash(digest, buf)
    return digest
}

function privateMessageSeal(message, recipientPubKey) {
    if(!Buffer.isBuffer(message)) this.emit('error', new Error('private message has to be a Buffer'))
    if(!Buffer.isBuffer(recipientPubKey) || recipientPubKey.length !== sodium.crypto_box_PUBLICKEYBYTES) this.emit('invalid public key')

    const ciphertext = Buffer.alloc(message.length + sodium.crypto_box_SEALBYTES)
    sodium.crypto_box_seal(ciphertext, message, recipientPubKey)
    return ciphertext
}

function privateMessageOpen(ciphertext, publicKey, secretKey) {
    if(!Buffer.isBuffer(ciphertext) || ciphertext.length <= sodium.crypto_box_SEALBYTES) this.emit('error', new Error('invalid ciphertext'))
    if(!Buffer.isBuffer(publicKey) || publicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) this.emit('invalid public key')
    if(!Buffer.isBuffer(secretKey) || secretKey.length !== sodium.crypto_box_SECRETKEYBYTES) this.emit('invalid secret key')

    const message = Buffer.alloc(ciphertext.length - sodium.crypto_box_SEALBYTES)
    if(!sodium.crypto_box_seal_open(message, ciphertext, publicKey, secretKey)) {
        this.emit('error', 'failed to open sealed box - corrupted or not intended for this receipient')
        return null
    }
    return message
}

module.exports = { 
    PubSub, 
    debug: () => { 
        debug = msg => console.debug(msg)
        return {PubSub}
    }}