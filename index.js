var url = require('url')
var zlib = require('zlib')

var SimplePeer = require('simple-peer')

var clipboard = require('clipboard')

var DEV = process.env['LOCALDEV'] || false
var video, videoSize, robot

var configForm = document.querySelector('.inputs')

var constraints = {
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'screen',
      maxWidth: 1280,
      maxHeight: 720,
      maxFrameRate: 15
    },
    optional: []
  }
}

if (process.env.REMOTE) {
  var peer = new SimplePeer({ trickle: false })
  console.log('client peer')
  handleSignal(peer)
} else {
  robot = require('./robot.js')
  navigator.webkitGetUserMedia(constraints, function(stream) {
    var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
    console.log('host peer', peer)
    handleSignal(peer)
  }, function(e) {
    if (e.code == e.PERMISSION_DENIED) {
      console.error(e)
      throw new Error('SCREENSHARING PERMISSION DENIED')
    }
  }) 
}


function handleSignal(peer) {
  window.peer = peer
  peer.on('signal', function (data) {
    // sdp is ~2.5k usually, that's too big for a URL, so we zlib deflate it
    zlib.deflate(JSON.stringify(data), function(err, deflated) {
      var connectionString = deflated.toString('base64')
      var code = encodeURIComponent(connectionString)
      document.querySelector('input').value = code
      document.querySelector('.copy').addEventListener('click', function(e) {
        e.preventDefault()
        clipboard.writeText(code)
      })
    })
  })
  
  document.querySelector('.load').addEventListener('click', function(e) {
    e.preventDefault()
    var code = clipboard.readText()
    code = decodeURIComponent(code)
    zlib.inflate(new Buffer(code, 'base64'), function(err, inflated) {
      peer.signal(JSON.parse(inflated.toString()))
    })
  })

  peer.on('message', function(data) {
    console.log(JSON.stringify(data))
    configForm.className = 'inputs hidden'
    if (robot) robot(data)
  })

  if (process.env.REMOTE) {
    if (peer.ready) startSending()
    else peer.on('ready', startSending)
      
    function startSending() {
      console.log('start sending...')
      window.addEventListener('mousedown', function mousedown (e) {
        var data = getMouseData(e)
        data.click = true
        
        if (!DEV) peer.send(data)
        else console.log('not sending mousedown')
      })

      window.addEventListener('keydown', function keydown (e) {
        var data = {
          keyCode: e.keyCode,
          shift: e.shiftKey,
          meta: e.metaKey,
          control: e.ctrlKey,
          alt: e.altKey
        }

        if (!DEV) peer.send(data)
        else console.log('not sending keydown ' + e.keyCode)
      })

      function getMouseData(e) {
        var data = {}
        data.clientX = e.clientX
        data.clientY = e.clientY

        if (video) {
          videoSize = video.getBoundingClientRect()
          data.canvasWidth = videoSize.width
          data.canvasHeight = videoSize.height
        }

        return data
      }
    }
  }

  peer.on('stream', function (stream) {
    video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    var container = document.querySelector('.container')
    container.appendChild(video)
  })
}

function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}
