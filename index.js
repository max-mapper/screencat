var zlib = require('zlib')

var ipc = require('ipc')
var clipboard = require('clipboard')

var SimplePeer = require('simple-peer')
var request = require('request')
var ssejson = require('ssejson')

var DEV = process.env.LOCALDEV || false
var server = 'http://catlobby.maxogden.com'
// var server = 'http://localhost:5005'

var video, videoSize, robot

var containers = {
  share: document.querySelector('.share-container'),
  join: document.querySelector('.join-container'),
  content: document.querySelector('.content-container'),
  choose: document.querySelector('.choose-container'),
  video: document.querySelector('.video-container'),
  sharing: document.querySelector('.sharing-container')
}

var buttons = {
  share: document.querySelector('.share-button'),
  join: document.querySelector('.join-button'),
  copy: document.querySelector('.code-copy-button'),
  paste: document.querySelector('.code-paste-button'),
  quit: document.querySelector('.quit-button')
}

var inputs = {
  copy: document.querySelector('.code-copy-input'),
  paste: document.querySelector('.code-paste-input')
}

buttons.share.addEventListener('click', function (e) {
  containers.choose.className += ' dn'
  containers.share.className += ' db'
  startHandshake(false)
})

buttons.join.addEventListener('click', function (e) {
  containers.choose.className += ' dn'
  containers.join.className += ' db'
  startHandshake(true)
})

buttons.quit.addEventListener('click', function (e) {
  ipc.send('terminate')
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

function startHandshake (remote) {
  if (remote) {
    var peer = new SimplePeer({ trickle: false })
    console.log('client peer')
    handleSignal(peer, remote)
  } else {
    robot = require('./robot.js')
    navigator.webkitGetUserMedia(constraints, function (stream) {
      var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
      console.log('host peer', peer)
      inputs.copy.value = 'Loading...'
      handleSignal(peer, remote)
    }, function (e) {
      if (e.code === e.PERMISSION_DENIED) {
        console.error(e)
        throw new Error('SCREENSHARING PERMISSION DENIED')
      }
    })
  }
}

function handleSignal (peer, remote) {
  window.peer = peer
  var pingName

  peer.on('signal', function (data) {
    // sdp is ~2.5k usually, that's too big for a URL, so we zlib deflate it
    var stringified = JSON.stringify(data)
    zlib.deflate(stringified, function (err, deflated) {
      if (err) {
        containers.content.innerHTML = 'Error! Please Quit'
        return
      }
      var connectionString = deflated.toString('base64')
      var code = encodeURIComponent(connectionString)
      console.log('sdp length', code.length)

      // upload pong sdp
      if (remote) {
        if (!pingName) {
          inputs.paste.value = 'Error! Please Quit'
          return
        }
        request.post({body: code, uri: server + '/pong/' + pingName}, function resp (err, resp, body) {
          if (err) {
            inputs.paste.value = err.message
            return
          }
        })
      }

      // upload initial sdp
      if (!remote) {
        request.post({body: code, uri: server + '/ping'}, function resp (err, resp, body) {
          if (err) {
            inputs.copy.value = 'Error! ' + err.message
            return
          }
          var ping = JSON.parse(body)
          inputs.copy.value = ping.name
          buttons.copy.addEventListener('click', function (e) {
            e.preventDefault()
            clipboard.writeText(ping.name)
          })

          // listen for sdp pongs
          var req = request(server + '/pongs/' + ping.name)
            .pipe(ssejson.parse())
            .on('data', function data (pong) {
              console.log('pong sdp length', pong.length)
              inflate(pong, function inflated (err, stringified) {
                if (err) {
                  inputs.copy.value = 'Error! Please Quit'
                  return
                }
                peer.signal(JSON.parse(stringified.toString()))
                req.end()
              })
            })
            .on('error', function error (err) {
              inputs.copy.value = err.message
            })
        })
      }
    })
  })

  buttons.paste.addEventListener('click', function (e) {
    e.preventDefault()
    var ping = inputs.paste.value
    inputs.paste.value = 'Connecting...'
    if (!ping) return
    request({uri: server + '/ping/' + ping}, function resp (err, resp, data) {
      if (err) {
        inputs.paste.value = 'Error! ' + err.message
        return
      }
      console.log('sdp response length', data.length)
      inflate(data, function inflated (err, stringified) {
        if (err) return
        pingName = ping
        peer.signal(JSON.parse(stringified.toString()))
      })
    })
  })

  peer.on('data', function (data) {
    console.log(JSON.stringify(data))
    containers.content.className += ' dn'
    if (robot) robot(data)
  })

  if (peer.connected) onConnect()
  else peer.on('connect', onConnect)

  function onConnect () {
    containers.content.className += ' dn' // hide ui
    if (!remote) {
      containers.sharing.className += ' db' // show
      return
    }
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

    function getMouseData (e) {
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

  function inflate (data, cb) {
    data = decodeURIComponent(data.toString())
    zlib.inflate(new Buffer(data, 'base64'), cb)
  }

  peer.on('stream', function (stream) {
    video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    containers.video.appendChild(video)
  })
}
