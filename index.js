var url = require('url')
var zlib = require('zlib')

var SimplePeer = require('simple-peer')
var throttle = require('throttleit')
var vkey = require('vkey')

var clipboard = require('clipboard')

var DEV = process.env['LOCALDEV'] || false
var video, videoSize, robot

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
  robot = require('robotjs')
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
    if (data.click) {
      var x = scale(data.clientX, 0, data.canvasWidth, 0, screen.width)
      var y = scale(data.clientY, 0, data.canvasHeight, 0, screen.height)
      var pos = robot.getMousePos() // hosts current x/y
      robot.moveMouse(x, y) // move to remotes pos
      robot.mouseClick() // click on remote click spot
      robot.moveMouse(pos.x, pos.y) // go back to hosts position
    }

    if (data.keyCode) {
      var k = vkey[data.keyCode].toLowerCase()
      if (k === '<space>') k = ' '
      var modifiers = []
      if (data.shift) modifiers.push('shift')
      if (data.control) modifiers.push('control')
      if (data.alt) modifiers.push('alt')
      if (data.meta) modifiers.push('meta')
      if (k[0] !== '<') {
        setTimeout(function() {
          console.log('typed ' +  k + ' ' +JSON.stringify(modifiers))
          robot.keyTap(k, modifiers[0])
        }, TIMEOUT)
      } else {
             if (k === '<enter>') robot.keyTap('enter')
        else if (k === '<backspace>') robot.keyTap('backspace')
        else if (k === '<up>') robot.keyTap('up')
        else if (k === '<down>') robot.keyTap('down')
        else if (k === '<left>') robot.keyTap('left')
        else if (k === '<right>') robot.keyTap('right')
        else if (k === '<delete>') robot.keyTap('delete')
        else if (k === '<home>') robot.keyTap('home')
        else if (k === '<end>') robot.keyTap('end')
        else if (k === '<page-up>') robot.keyTap('pageup')
        else if (k === '<page-down>') robot.keyTap('pagedown')
        else console.log('did not type ' + k)
      }
    }
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
