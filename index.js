const {Message} = require('./messages')
const sodium = require('sodium-universal')

const MSG_TYPE_SUBSCRIBE = 1;
const MSG_TYPE_UNSUBSCRIBE = 2;
const MSG_TYPE_MESSAGE = 3;

class PubSub {

    constructor(networker, opts) {
        this.opts = opts || {}
        this.subscribers = new Map()
        this.networker = networker
        this.topics = new Map()
        this.extension = this.networker.registerExtension({
            name: 'hyperpubsub',
            onmessage: this._onMessage,
            encoding: Message,
            onerror: this.opts.onError
        })
    }

    sub(topic, handler) {
        this.topics.set(topic, handler)

        this.join(topic)
            .then(() => {
                this.extension.broadcast({topic, type: MSG_TYPE_SUBSCRIBE, application: this.opts.application})
            })
            .catch(err => {
                if(this.opts.onError) this.opts.onError(err)
                else throw err
            })
    }

    pub(topic, message) {
        const peers = this.subscribers.get(topic) || []
        for(const peer of peers) {
            this.extension.send({topic, type: MSG_TYPE_MESSAGE, application: this.opts.application, message}, peer)
        }
    }

    unsub(topic) {
        this.topics.delete(topic)
        this.extension.broadcast({topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application})
    }

    close() { 
        for(const topic of this.topics.keys()) {
            this.unsub(topic)
        }
        this.extension.destroy()
    }

    join(topic, opts = {lookup: true, announce: true, flush: true, remember: false}) {
        const discoveryKey = hash('hyperpubsub.' + topic)
        return this.networker.configure(discoveryKey, opts).then(() => discoveryKey.toString('hex'))
    }

    _onMessage(msg, peer) {
        switch(msg.type) {
            case MSG_TYPE_SUBSCRIBE:
                this._addPeer(peer, msg.topic)
            break

            case MSG_TYPE_UNSUBSCRIBE: 
                this._removePeer(peer, msg.topic)
            break

            case MSG_TYPE_MESSAGE: 
                const handler = this.topics.get(msg.topic)
                if(handler) handler(msg.data, msg.application)
                else this.extension.send({topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application}, peer)
            break

            default:
                throw new Error('Invalid PubSub message type: ' + msg.type)
        }
    }

    _addPeer(peer, topic) {
        let peers = []
        if(this.subscribers.has(topic)) peers = this.subscribers.get(topic)
        else this.subscribers.set(topic, peers)
        peers.push(peer)
    }

    _removePeer(peer, topic) {
        if(this.subscribers.has(topic)){
            /** @type {[]} */
            const peers = this.subscribers.get(topic)
            const idx = peers.findIndex(p => p === peer)
            if(idx >= 0) peers.splice(idx, 1)
        }
    }

}

function hash(txt) {
    const buf = Buffer.from(txt, 'utf-8')
    const digest = Buffer.allocUnsafe(32)
    sodium.crypto_generichash(digest, buf)
    return digest
}

module.exports = PubSub