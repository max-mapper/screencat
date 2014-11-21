var SimplePeer = require('simple-peer')
var url = require('url')
var zlib = require('zlib')

var qs = url.parse(window.location.href, true).query
var constraints = {
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'screen',
      minWidth: 1280,
      minHeight: 720
    },
    optional: []
  }
}

console.log('hi')

if (!qs.remote) {
  navigator.webkitGetUserMedia(constraints, function(stream) {
    var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
    handleSignal(peer)
  }, function(e) {
    if (e.code == e.PERMISSION_DENIED) {
      console.error(e)
      console.error('PERMISSION_DENIED. Are you on SSL? Have you enabled the --enable-usermedia-screen-capturing flag?')
    }
  })
} else {
  var peer = new SimplePeer({ trickle: false })
  handleSignal(peer)
}

function handleSignal(peer) {
  peer.on('signal', function (data) {
    zlib.deflate(JSON.stringify(data), function(err, deflated) {
      console.log('connect(' + JSON.stringify({"signal": deflated.toString('base64')}) + ')')
    })
  })

  window.connect = function(data) {
    var b64signal = data.signal
    zlib.inflate(new Buffer(b64signal, 'base64'), function(err, inflated) {
      var signal = JSON.parse(inflated.toString())
      peer.signal(signal)
    })
  }

  peer.on('stream', function (stream) {
    var video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    document.body.appendChild(video)
  })
}


