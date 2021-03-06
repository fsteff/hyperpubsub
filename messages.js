// This file is auto generated by the protocol-buffers compiler

/* eslint-disable quotes */
/* eslint-disable indent */
/* eslint-disable no-redeclare */
/* eslint-disable camelcase */

// Remember to `npm install --save protocol-buffers-encodings`
var encodings = require('protocol-buffers-encodings')
var varint = encodings.varint
var skip = encodings.skip

var PubSubMessage = exports.PubSubMessage = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var PexMessage = exports.PexMessage = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var PexBatch = exports.PexBatch = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

definePubSubMessage()
definePexMessage()
definePexBatch()

function definePubSubMessage () {
  PubSubMessage.encodingLength = encodingLength
  PubSubMessage.encode = encode
  PubSubMessage.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.topic)) throw new Error("topic is required")
    var len = encodings.string.encodingLength(obj.topic)
    length += 1 + len
    if (!defined(obj.type)) throw new Error("type is required")
    var len = encodings.varint.encodingLength(obj.type)
    length += 1 + len
    if (defined(obj.application)) {
      var len = encodings.string.encodingLength(obj.application)
      length += 1 + len
    }
    if (defined(obj.data)) {
      var len = encodings.bytes.encodingLength(obj.data)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.topic)) throw new Error("topic is required")
    buf[offset++] = 10
    encodings.string.encode(obj.topic, buf, offset)
    offset += encodings.string.encode.bytes
    if (!defined(obj.type)) throw new Error("type is required")
    buf[offset++] = 16
    encodings.varint.encode(obj.type, buf, offset)
    offset += encodings.varint.encode.bytes
    if (defined(obj.application)) {
      buf[offset++] = 26
      encodings.string.encode(obj.application, buf, offset)
      offset += encodings.string.encode.bytes
    }
    if (defined(obj.data)) {
      buf[offset++] = 34
      encodings.bytes.encode(obj.data, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      topic: "",
      type: 0,
      application: "",
      data: null
    }
    var found0 = false
    var found1 = false
    while (true) {
      if (end <= offset) {
        if (!found0 || !found1) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.topic = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        found0 = true
        break
        case 2:
        obj.type = encodings.varint.decode(buf, offset)
        offset += encodings.varint.decode.bytes
        found1 = true
        break
        case 3:
        obj.application = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        break
        case 4:
        obj.data = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function definePexMessage () {
  PexMessage.encodingLength = encodingLength
  PexMessage.encode = encode
  PexMessage.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.discoveryKey)) throw new Error("discoveryKey is required")
    var len = encodings.bytes.encodingLength(obj.discoveryKey)
    length += 1 + len
    if (defined(obj.address)) {
      var len = encodings.string.encodingLength(obj.address)
      length += 1 + len
    }
    if (defined(obj.publicKey)) {
      var len = encodings.bytes.encodingLength(obj.publicKey)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.discoveryKey)) throw new Error("discoveryKey is required")
    buf[offset++] = 10
    encodings.bytes.encode(obj.discoveryKey, buf, offset)
    offset += encodings.bytes.encode.bytes
    if (defined(obj.address)) {
      buf[offset++] = 18
      encodings.string.encode(obj.address, buf, offset)
      offset += encodings.string.encode.bytes
    }
    if (defined(obj.publicKey)) {
      buf[offset++] = 26
      encodings.bytes.encode(obj.publicKey, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      discoveryKey: null,
      address: "",
      publicKey: null
    }
    var found0 = false
    while (true) {
      if (end <= offset) {
        if (!found0) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.discoveryKey = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        found0 = true
        break
        case 2:
        obj.address = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        break
        case 3:
        obj.publicKey = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function definePexBatch () {
  PexBatch.encodingLength = encodingLength
  PexBatch.encode = encode
  PexBatch.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (defined(obj.messages)) {
      for (var i = 0; i < obj.messages.length; i++) {
        if (!defined(obj.messages[i])) continue
        var len = PexMessage.encodingLength(obj.messages[i])
        length += varint.encodingLength(len)
        length += 1 + len
      }
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (defined(obj.messages)) {
      for (var i = 0; i < obj.messages.length; i++) {
        if (!defined(obj.messages[i])) continue
        buf[offset++] = 10
        varint.encode(PexMessage.encodingLength(obj.messages[i]), buf, offset)
        offset += varint.encode.bytes
        PexMessage.encode(obj.messages[i], buf, offset)
        offset += PexMessage.encode.bytes
      }
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      messages: []
    }
    while (true) {
      if (end <= offset) {
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        obj.messages.push(PexMessage.decode(buf, offset, offset + len))
        offset += PexMessage.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defined (val) {
  return val !== null && val !== undefined && (typeof val !== 'number' || !isNaN(val))
}
