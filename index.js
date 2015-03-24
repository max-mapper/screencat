var SimplePeer = require('simple-peer')
var url = require('url')
var zlib = require('zlib')
var throttle = require('throttleit')
var vkey = require('vkey')
var ipc = require('ipc')

var video, videoSize, robot, lastData

ipc.on('window-position', function(data) {
  lastData = data
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
    zlib.deflate(JSON.stringify(data), function(err, deflated) {
      var connectionString = JSON.stringify({
        "signal": deflated.toString('base64'),
        "width": screen.width,
        "height": screen.height
      }) 
    
      console.log('connect(' + connectionString + ')')
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

  // var last = Date.now()
  peer.on('message', function(data) {
    // console.log(JSON.stringify(data), (Date.now() - last) + 'ms')
    // last = Date.now()
    
    console.log(lastData, data)
    if (lastData && data.clientX) {
      var projectedX = data.clientX / data.canvasWidth * screen.width
      var projectedY = data.clientY / data.canvasHeight * screen.height
    
      // var realScreenX = lastData.screenX - lastData.clientX
      // var realScreenY = lastData.screenY - lastData.clientY

      var pointX = projectedX - lastData.x
      var pointY = projectedY - lastData.y
      console.log('MOUSEMOVE', pointX, pointY)
    }

    // fakeMouse.style.top = pointY + 'px'
    // fakeMouse.style.left = pointX + 'px'
    
    if (data.click) {
      console.log('GOT CLICK', data.click, [pointX, pointY])
    }

    if (data.keydown) {
      console.log("GOT KEYDOWN", data.keydown, vkey[data.keydown])
      var k = vkey[data.keydown]
      if (k.length === 1) {
        setTimeout(function() {
          robot.typeString(k)
        }, 1000)
      }
      // var val = ''
      // data.keydown.forEach(function(e) {
      //
      // })
    }
  })

  
  if (process.env.REMOTE) {
    if (peer.ready) startSending()
    else peer.on('ready', startSending)
      
    function startSending() {
      window.addEventListener('mousedown', function mousedown (e) {
        var data = getMouseData(e)
        data.click = true
        peer.send(data)
      })

      window.addEventListener('mousemove', throttle(
        function mousemove (e) {
          peer.send(getMouseData(e))
        },
        1000
      ))

      window.addEventListener('keydown', function keydown (e) {
        var data = {keydown: e.keyCode}
        videoSize = video.getBoundingClientRect()
        data.canvasWidth = videoSize.width
        data.canvasHeight = videoSize.height
        peer.send(data)
      })

      function getMouseData(e) {
        var data = {}
        data.screenX = e.screenX
        data.screenY = e.screenY
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
