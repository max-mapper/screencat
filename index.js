var url = require('url')
var zlib = require('zlib')

var SimplePeer = require('simple-peer')

var clipboard = require('clipboard')

var DEV = process.env.LOCALDEV || false

var video, videoSize, robot

var containers = {
  share: document.querySelector('.share-container'),
  join: document.querySelector('.join-container'),
  content: document.querySelector('.content-container'),
  choose: document.querySelector('.choose-container'),
  video: document.querySelector('.video-container')
}

var buttons = {
  share: document.querySelector('.share-button'),
  join: document.querySelector('.join-button'),
  copy: document.querySelector('.code-copy-button'),
  paste: document.querySelector('.code-paste-button')
}

var inputs = {
  copy: document.querySelector('.code-copy-input'),
  paste: document.querySelector('.code-paste-input')
}

buttons.share.addEventListener('click', function(e) {
  containers.choose.className += ' dn'
  containers.share.className += ' db'
  startHandshake(false)
})

buttons.join.addEventListener('click', function(e) {
  containers.choose.className += ' dn'
  containers.join.className += ' db'
  startHandshake(true)
})

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

function startHandshake(remote) {
  if (remote) {
    var peer = new SimplePeer({ trickle: false })
    console.log('client peer')
    handleSignal(peer, remote)
  } else {
    robot = require('./robot.js')
    navigator.webkitGetUserMedia(constraints, function(stream) {
      var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
      console.log('host peer', peer)
      handleSignal(peer, remote)
    }, function(e) {
      if (e.code == e.PERMISSION_DENIED) {
        console.error(e)
        throw new Error('SCREENSHARING PERMISSION DENIED')
      }
    }) 
  }
}

function handleSignal(peer, remote) {
  window.peer = peer
  peer.on('signal', function (data) {
    // sdp is ~2.5k usually, that's too big for a URL, so we zlib deflate it
    zlib.deflate(JSON.stringify(data), function(err, deflated) {
      var connectionString = deflated.toString('base64')
      var code = encodeURIComponent(connectionString)
      inputs.copy.value = code
      buttons.copy.addEventListener('click', function(e) {
        e.preventDefault()
        clipboard.writeText(code)
      })
    })
  })
  
  buttons.paste.addEventListener('click', function(e) {
    e.preventDefault()
    var code = inputs.paste.value
    if (!code) return
    code = decodeURIComponent(code)
    zlib.inflate(new Buffer(code, 'base64'), function(err, inflated) {
      if (err) return
      peer.signal(JSON.parse(inflated.toString()))
    })
  })

  peer.on('data', function(data) {
    console.log(JSON.stringify(data))
    containers.content.className += ' dn'
    if (robot) robot(data)
  })

  if (peer.connected) onConnect()
  else peer.on('connect', onConnect)

  function onConnect() {
    containers.content.className += ' dn' // hide ui
    if (!remote) return
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

  peer.on('stream', function (stream) {
    video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    containers.video.appendChild(video)
  })
}

function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}
