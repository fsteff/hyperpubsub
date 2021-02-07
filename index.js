const {Message} = require('./messages')
const sodium = require('sodium-universal')

const MSG_TYPE_SUBSCRIBE = 1;
const MSG_TYPE_UNSUBSCRIBE = 2;
const MSG_TYPE_MESSAGE = 3;

class PubSub {

    constructor(network, opts) {
        this.opts = opts || {}
        this.subscribers = new Map()
        this.network = network
        this.topics = new Map()
        this.extension = this.network.registerExtension({
            name: 'hyperpubsub',
            onmessage: (msg, peer) => this._onMessage(msg, peer),
            encoding: Message,
            onerror: this.opts.onError
        })

        this.network.on('peer-add', peer => {
            console.debug('peer-add ' + peer.remoteAddress)
            for (const topic of this.topics.keys()) {
                console.debug('<- ' + 'sub ' + topic + ' to ' + peer.remoteAddress)
                this.extension.send({topic, type: MSG_TYPE_SUBSCRIBE, application: this.opts.application}, peer)
            }
        })

        this.network.on('peer-remove', peer => {
            console.debug('peer-remove ' + peer.remoteAddress)
            for (const topic of this.subscribers.keys()) {
                this._removePeer(peer, topic)
            }
        })
    }

    sub(topic, handler) {
        this.topics.set(topic, handler)

        this.join(topic)
            .then(() => {
                console.debug('<- ' + 'sub ' + topic + ' broadcast')
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
            console.debug('<- ' + 'msg ' + topic + (' (' + message.toString('utf-8') + ') ') + ' to ' + peer.remoteAddress)
            this.extension.send({topic, type: MSG_TYPE_MESSAGE, application: this.opts.application, data: message}, peer)
        }
    }

    unsub(topic) {
        this.topics.delete(topic)
        console.debug('<- ' + 'unsub ' + topic + ' broadcast')
        this.extension.broadcast({topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application})
    }

    close() { 
        this.extension.destroy()
        delete this.topics
        delete this.subscribers
    }

    join(topic, opts = {lookup: true, announce: true, flush: true, remember: false}) {
        const discoveryKey = hash('hyperpubsub.' + topic)
        return this.network.configure(discoveryKey, opts).then(() => discoveryKey.toString('hex'))
    }

    _onMessage(msg, peer) {
        try {
            switch(msg.type) {
                case MSG_TYPE_SUBSCRIBE:
                    console.debug('-> msg sub ' + msg.topic + ' from ' + peer.remoteAddress)
                    this._addPeer(peer, msg.topic)
                break

                case MSG_TYPE_UNSUBSCRIBE: 
                    console.debug('-> msg unsub ' + msg.topic + ' from ' + peer.remoteAddress)
                    this._removePeer(peer, msg.topic)
                break

                case MSG_TYPE_MESSAGE: 
                    const content = msg.data ?  msg.data.toString('utf-8') : ''
                    console.debug('-> msg data ' + msg.topic + (' (' + content + ') ') + ' from ' + peer.remoteAddress)
                    const handler = this.topics.get(msg.topic)
                    if(handler) handler(msg.data, msg.application)
                    else console.error('no handler found for topic ' + topic)
                    //else this.extension.send({topic, type: MSG_TYPE_UNSUBSCRIBE, application: opts.application}, peer)
                break

                default:
                    throw new Error('Invalid PubSub message type: ' + msg.type)
            }
        } catch (err) {
            if(this.onError) this.onError(err)
            console.error(err)
        }
    }

    _addPeer(peer, topic) {
        let peers = []
        if(this.subscribers.has(topic)) peers = this.subscribers.get(topic)
        else this.subscribers.set(topic, peers)
        
        if(!peers.find(p => p.remoteAddress === peer.remoteAddress)) {
            peers.push(peer)
            console.debug('subscriber ' + peer.remoteAddress + ' added to topic ' + topic)
        }
    }

    _removePeer(peer, topic) {
        if(this.subscribers.has(topic)){
            const peers = this.subscribers.get(topic)
            const idx = peers.findIndex(p => p.remoteAddress === peer.remoteAddress)
            if(idx >= 0) {
                peers.splice(idx, 1)
                console.debug('subscriber ' + peer.remoteAddress + ' removed from topic ' + topic)
            }
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