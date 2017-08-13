'use strict'

const dagPB = require('ipld-dag-pb')
const dagCBOR = require('ipld-dag-cbor')
const promisify = require('promisify-es6')
const CID = require('cids')
const waterfall = require('async/waterfall')
const block = require('../block')

module.exports = (send) => {
  return promisify((cid, path, options, callback) => {
    if (typeof path === 'function') {
      callback = path
      path = undefined
    }

    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    options = options || {}

    if (CID.isCID(cid)) {
      cid = cid.toBaseEncodedString()
    }

    if (typeof cid === 'string') {
      const split = cid.split('/')
      cid = split[0]
      split.shift()

      if (split.length > 0) {
        path = split.join('/')
      } else {
        path = '/'
      }
    }

    waterfall([
      cb => {
        send({
          path: 'dag/resolve',
          args: cid + '/' + path,
          qs: options
        }, cb)
      },
      (resolved, cb) => {
        block(send).get(new CID(resolved['Cid']['/']), (err, blk) => cb(err, blk, resolved['RemPath']))
      },
      (blk, path, cb) => {
        if (blk.cid.codec === 'dag-cbor') {
          dagCBOR.resolver.resolve(blk, path, cb)
        }
        if (blk.cid.codec === 'dag-pb') {
          dagPB.resolver.resolve(blk, path, cb)
        }
      }
    ], callback)
  })
}