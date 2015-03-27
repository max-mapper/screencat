var http = require('http')

var HttpHashRouter = require('http-hash-router')
var catNames = require('cat-names')
var concat = require('concat-stream')
var pumpify = require('pumpify')

var limitStream = require('./limit-stream.js')

var router = HttpHashRouter()
var port = process.env.PORT || 5005

var rooms = {}

router.set('/room', function room (req, res, opts, cb) {
  if (req.method !== "POST") {
    var err = new Error('Only POST is allowed')
    err.statusCode = 405
    return cb(err)
  }
  
  var limiter = limitStream(1024 * 5) // 5kb max
  limiter.on('error', cb)
  
  var concatter = concat(function concatted (buff) {
    var room = makeName()
    rooms[room] = buff
    setTimeout(function expire () {
      delete rooms[room]
    }, 1000 * 60 * 30) // 30 mins
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({name: room}))
  })
  
  pumpify(req, limiter, concatter)
})

router.set('/rooms/:id', function room (req, res, opts, cb) {
  var code = rooms[opts.params.id]
  if (!code) {
    var err = new Error('Doesnt exist or expired')
    err.statusCode = 404
    return cb(err)
  }
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({code: code.toString()}))
  cb()
})

var server = http.createServer(function handler (req, res) {
  router(req, res, {}, onError)

  function onError (err) {
    if (err) {
      res.statusCode = err.statusCode || 500
      res.end(err.message)
    }
  }
})

server.listen(port, function listening (err) {
  if (err) return console.error(err)
  console.log('Listening on port', port)
})

function makeName () {
  var n = [rnd(), rnd(), rnd()].join('-')
  if (rooms[n]) return makeName()
  return n
}

function rnd () {
  return catNames.random().toLowerCase().replace(/\s/g, '-')
}
