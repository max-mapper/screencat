window.debug = require('debug')
var synthEvent = window.synthEvent = require('synthetic-dom-events')
var SimplePeer = require('simple-peer')
var url = require('url')
var zlib = require('zlib')
var video, remoteWidth, remoteHeight

var fakeMouse = document.createElement('div')
fakeMouse.style.width = '5px'
fakeMouse.style.height = '5px'
fakeMouse.style.background = 'salmon'
fakeMouse.style.position = 'absolute'
fakeMouse.style.pointerEvents = 'none'
fakeMouse.style.transition = 'top 0.2s, left 0.2s ease-out'


var qs = url.parse(window.location.href, true).query
var constraints = {
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'screen',
      maxWidth: 1280,
      maxHeight: 720,
      maxFrameRate: 1
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
      console.log('connect(' + JSON.stringify({
        "signal": deflated.toString('base64'),
        "width": screen.width,
        "height": screen.height
      }) + ')')
    })
  })

  window.connect = function(data) {
    remoteWidth = data.width
    remoteHeight = data.height
    if (remoteWidth < screen.width && remoteHeight < screen.height)
      video.setAttribute('style', 'width: ' + remoteWidth + 'px; ' + 'height: ' + remoteHeight + 'px;')
      
    var b64signal = data.signal
    zlib.inflate(new Buffer(b64signal, 'base64'), function(err, inflated) {
      var signal = JSON.parse(inflated.toString())
      peer.signal(signal)
    })
  }

  var last = Date.now()
  peer.on('message', function(data) {
    console.log(JSON.stringify(data), (Date.now() - last) + 'ms')
    last = Date.now()
    
    if (!data.canvasWidth) return
    projectedX = data.clientX / data.canvasWidth * screen.width
    projectedY = data.clientY / data.canvasHeight * screen.height
    
    realScreenX = lastData.screenX - lastData.clientX
    realScreenY = lastData.screenY - lastData.clientY
    
    pointX = projectedX - realScreenX | 0
    pointY = projectedY - realScreenY | 0
    
    fakeMouse.style.top = pointY + 'px'
    fakeMouse.style.left = pointX + 'px'
    
    if (data.click) {
      var targetEl = document.elementFromPoint(pointX, pointY)
      console.log(targetEl)
      var clickOpts = {
        view: window,
        bubbles: true,
        cancelable: true
      }
      
      targetEl.dispatchEvent(synthEvent('click', clickOpts))
    }
    
    if (data.keydown && data.keydown.length) {
      data.keydown.forEach(function(e) {
        var el = document.activeElement
        el.dispatchEvent(synthEvent('keydown', e))  
      })
    }
  })
  
  if (!qs.remote) document.body.appendChild(fakeMouse)

  peer.on('stream', function (stream) {
    if (qs.remote) {
      peer.on('ready', function() {
        setInterval(function() {
          if (!needsSend) return console.log('does not need send')
          peer.send(lastData)
          needsSend = false
          lastData = {}
        }, 100)
      })
    }
    
    video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    var container = document.querySelector('.container')
    container.appendChild(video)
  })
}

var lastData = {}, needsSend = true
window.addEventListener('mousedown', function(e){
  lastData.click = true
  updateLastData(e)
})

window.addEventListener('mousemove', function(e){
  updateLastData(e)
})

window.addEventListener('keydown', function(e) {
  lastData.keydown = lastData.keydown || []
  lastData.keydown.push({keyCode: e.keyCode})
  needsSend = true
})

function updateLastData(e) {
  lastData.screenX = e.screenX
  lastData.screenY = e.screenY
  lastData.clientX = e.clientX
  lastData.clientY = e.clientY
  
  if (video) {
    var rects = video.getBoundingClientRect()
    lastData.canvasWidth = rects.width
    lastData.canvasHeight = rects.height
  }

  needsSend = true
}