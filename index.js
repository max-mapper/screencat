var SimplePeer = require('simple-peer')
var url = require('url')

var qs = url.parse(window.location.href, true).query
var constraints = {
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'screen'
    },
    optional: []
  }
}

if (!qs.remote) {
  navigator.webkitGetUserMedia(constraints, function(stream) {
    var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
    handleSignal(peer)
  }, function(e) {
    if (e.code == e.PERMISSION_DENIED) {
      console.error(e)
      console.error('PERMISSION_DENIED. Are you no SSL? Have you enabled the --enable-usermedia-screen-capture flag?')
    }
  })
} else {
  var peer = new SimplePeer({ trickle: false })
  handleSignal(peer)
}

function handleSignal(peer) {
  peer.on('signal', function (data) {
    console.log('connect(' + JSON.stringify({"signal": new Buffer(JSON.stringify(data)).toString('base64')}) + ')')
  })

  window.connect = function(data) {
    var b64signal = data.signal
    var signal = JSON.parse(new Buffer(b64signal, 'base64').toString())
    peer.signal(signal)
  }

  peer.on('stream', function (stream) {
    var video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    document.body.appendChild(video)
  })
}


