/* global screen, EventSource */
var zlib = require('zlib')
var events = require('events')

var SimplePeer = require('simple-peer')
var nets = require('nets')
var getUserMedia = require('./get-user-media.js')()

module.exports = function create (opts) {
  var server = 'http://catlobby.maxogden.com'
  // var server = 'http://localhost:5005'
  var remoteConfigUrl = 'https://instant.io/rtcConfig'
  if (process.browser) remoteConfigUrl = 'http://cors.maxogden.com/' + remoteConfigUrl

  var video, videoSize

  var constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'screen',
        maxWidth: screen.availWidth,
        maxHeight: screen.availHeight,
        maxFrameRate: 25
      },
      optional: []
    }
  }

  var app = new events.EventEmitter()
  app.getRemoteConfig = getRemoteConfig
  app.verifyRoom = verifyRoom
  app.remotePeer = remotePeer
  app.hostPeer = hostPeer
  app.handleSignal = handleSignal
  app.videoElement = videoElement
  app.audioElement = audioElement
  app.onConnect = onConnect
  app.createRoom = createRoom

  return app

  function verifyRoom (room, cb) {
    // ensure room is still open
    nets({method: 'POST', uri: server + '/v1/' + room + '/pong', json: {ready: true}}, function response (err, resp, data) {
      if (err) return cb(err)
      if (resp.statusCode !== 200) return cb(new Error('Invalid or expired invite code'))
      cb()
    })
  }

  // get remote webrtc config (ice/stun/turn)
  function getRemoteConfig (cb) {
    nets({url: remoteConfigUrl, json: true}, function gotConfig (err, resp, config) {
      if (err || resp.statusCode > 299) config = undefined // ignore errors
      cb(null, config)
    })
  }

  // try getusermedia and then upload sdp pong. this causes host to ping sdp back
  function getAudio (cb) {
    getUserMedia({audio: true, video: false}, function ok (stream) {
      cb(null, stream)
    },
    function error (err) {
      // screenshare even if remote doesnt wanna do audio
      if (err.name === 'PermissionDeniedError') {
        cb()
      } else {
        cb(err)
      }
    })
  }

  function remotePeer (config, room, cb) {
    // listen for pings
    var events = new EventSource(server + '/v1/' + room + '/pings')
    events.onmessage = function onMessage (e) {
      console.log('pings onmessage', e.data)
      var row
      try {
        row = JSON.parse(e.data)
      } catch (e) {
        row = {}
        return cb(new Error('Error connecting. Please start over.'))
      }

      if (!row.data) {
        return
      }

      inflate(row.data, function inflated (err, stringified) {
        if (err) return cb(err)

        app.emit('getting-audio')
        getAudio(function got (err, audioStream) {
          if (err) return handleRTCErr(err, cb)
          var peer = new SimplePeer({ trickle: false, config: config })
          if (audioStream) peer._pc.addStream(audioStream)
          peer.signal(JSON.parse(stringified.toString()))
          cb(null, peer)
        })
      })

      events.close()
    }

    events.onerror = function onError (e) {
      cb(new Error('Error connecting. Please start over.'))
      events.close()
    }
  }

  function createRoom (cb) {
    nets({method: 'POST', uri: server + '/v1'}, function response (err, resp, body) {
      if (err) return cb(err)
      var room = JSON.parse(body)
      cb(null, room.name)
    })
  }

  function hostPeer (room, config, cb) {
    var peer

    // listen for pongs
    var events = new EventSource(server + '/v1/' + room + '/pongs')
    events.onmessage = function onMessage (e) {
      console.log('pongs onmessage', e.data)
      var row
      try {
        row = JSON.parse(e.data)
      } catch (e) {
        return cb(new Error('Error connecting. Please start over.'))
      }

      // other side is ready
      if (row.ready) {
        connect(row.data)
      }

      // sdp from other side
      if (row.data) {
        inflate(row.data, function inflated (err, stringified) {
          if (err) {
            return cb(new Error('Error connecting. Please start over.'))
          }

          peer.signal(JSON.parse(stringified.toString()))
        })
        events.close()
      }

      function connect (pong) {
        // screensharing
        getUserMedia(constraints, function (videoStream) {
          // audio
          getUserMedia({audio: true, video: false}, function (audioStream) {
            peer = new SimplePeer({ initiator: true, trickle: false, config: config })
            peer._pc.addStream(videoStream)
            peer._pc.addStream(audioStream)
            app.emit('waiting-for-peer')
            cb(null, peer)
          }, function (err) { handleRTCErr(err, cb) })
        }, function (err) { handleRTCErr(err, cb) })
      }
    }

    events.onerror = function onError (e) {
      cb(e)
      events.close()
    }
  }

  function handleRTCErr (err, cb) {
    if (err.name === 'PermissionDeniedError') {
      console.error('permission denied')
      console.error(err)
      cb(new Error('Screensharing permission denied'))
    } else {
      console.error('Unknown error', err)
      cb(err)
    }
  }

  function handleSignal (sdp, peer, remote, room, cb) {
    deflate(sdp, function deflated (err, data) {
      if (err) return cb(err)

      // upload sdp
      var uploadURL = server + '/v1/' + room
      if (remote) uploadURL += '/pong'
      else uploadURL += '/ping'

      console.log('POST', uploadURL)
      nets({method: 'POST', json: {data: data}, uri: uploadURL}, function response (err, resp, body) {
        if (err || resp.statusCode > 299) return cb(err)
        cb(null)
      })
    })
  }

  function onConnect (peer, remote) {
    app.emit('connected', peer, remote)
    var queue = []

    window.addEventListener('mousedown', mousedownListener)
    window.addEventListener('keydown', keydownListener)

    if (!remote) {
      peer.on('data', function (data) {
        queue.push(data)
        if (queue.length === 1) startQueue()
      })
      return
    }

    peer.on('close', function cleanup () {
      window.removeEventListener('mousedown', mousedownListener)
      window.removeEventListener('keydown', keydownListener)
    })

    function mousedownListener (e) {
      var data = getMouseData(e)
      data.click = true
      console.log('send mouse', data)
      peer.send(data)
    }

    function keydownListener (e) {
      e.preventDefault()

      var data = {
        keyCode: e.keyCode,
        shift: e.shiftKey,
        meta: e.metaKey,
        control: e.ctrlKey,
        alt: e.altKey
      }

      console.log('send key', data)
      peer.send(data)
    }

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

    // magic queue that helps prevent weird key drop issues on the c++ side
    function startQueue () {
      if (queue.started) return
      queue.started = true
      queue.id = setInterval(function () {
        var next = queue.shift()
        if (!next) {
          clearInterval(queue.id)
          queue.started = false
          return
        }
        if (app.robot) {
          app.robot(next)
        }
      }, 0)
    }
  }

  function videoElement (stream) {
    var video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true
    return video
  }

  function audioElement (stream) {
    var audio = document.createElement('audio')
    audio.src = window.URL.createObjectURL(stream)
    audio.autoplay = true
    return audio
  }

  function inflate (data, cb) {
    data = decodeURIComponent(data.toString())
    zlib.inflate(new Buffer(data, 'base64'), cb)
  }

  function deflate (data, cb) {
    // sdp is ~2.5k usually, that's too big for a URL, so we zlib deflate it
    var stringified = JSON.stringify(data)
    zlib.deflate(stringified, function (err, deflated) {
      if (err) {
        cb(err)
        return
      }
      var connectionString = deflated.toString('base64')
      var code = encodeURIComponent(connectionString)
      cb(null, code)
    })
  }
}
