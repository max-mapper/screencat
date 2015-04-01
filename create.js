/* global screen, EventSource */
var zlib = require('zlib')

var SimplePeer = require('simple-peer')
var nets = require('nets')
var getUserMedia = require('./get-user-media.js')()

module.exports = function create (opts, connectedCb) {
  var server = 'http://catlobby.maxogden.com'
  // var server = 'http://localhost:5005'
  var remoteConfigUrl = 'https://instant.io/rtcConfig'
  if (process.browser) remoteConfigUrl = 'http://cors.maxogden.com/' + remoteConfigUrl

  var video, videoSize

  var ui = {}

  ui.containers = {
    share: document.querySelector('.share-container'),
    join: document.querySelector('.join-container'),
    content: document.querySelector('.content-container'),
    choose: document.querySelector('.choose-container'),
    video: document.querySelector('.video-container'),
    sharing: document.querySelector('.sharing-container')
  }

  ui.buttons = {
    share: document.querySelector('.share-button'),
    join: document.querySelector('.join-button'),
    copy: document.querySelector('.code-copy-button'),
    paste: document.querySelector('.code-paste-button'),
    quit: document.querySelector('.quit-button'),
    back: document.querySelector('.back-button'),
    destroy: document.querySelector('.destroy-button')
  }

  ui.inputs = {
    copy: document.querySelector('.code-copy-input'),
    paste: document.querySelector('.code-paste-input')
  }

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

  var app = {
    ui: ui,
    startHandshake: startHandshake,
    hide: hide,
    show: show
  }

  return app

  function startHandshake (remote) {
    nets({url: remoteConfigUrl, json: true}, function gotConfig (err, resp, config) {
      if (err || resp.statusCode > 299) config = undefined
      if (remote) remotePeer(config)
      else hostPeer(config)
    })

    function remotePeer (config) {
      // first, wait for user to enter room name
      ui.inputs.paste.value = ''
      ui.buttons.paste.addEventListener('click', onJoinClick)

      function onJoinClick (e) {
        e.preventDefault()
        var room = ui.inputs.paste.value
        ui.inputs.paste.value = 'Connecting...'
        if (!room) return
        // ensure room is still open
        nets({method: 'POST', uri: server + '/v1/' + room + '/pong', json: {ready: true}}, function response (err, resp, data) {
          if (err) {
            ui.inputs.paste.value = 'Error! ' + err.message
            return
          }
          if (resp.statusCode !== 200) {
            ui.inputs.paste.value = 'Invalid or expired invite code'
            return
          }
          listenForPings(room)
        })
      }

      function listenForPings (room) {
        ui.inputs.paste.value = 'Waiting on other side...'

        // listen for pings
        var events = new EventSource(server + '/v1/' + room + '/pings')
        events.onmessage = function onMessage (e) {
          var row
          try {
            row = JSON.parse(e.data)
          } catch (e) {
            ui.inputs.copy.value = 'Error connecting. Please start over.'
            row = {}
          }

          if (!row.data) {
            return
          }

          inflate(row.data, function inflated (err, stringified) {
            if (err) {
              ui.inputs.copy.value = 'Error! Please Quit'
              return
            }

            getAudio(function got (err, audioStream) {
              if (err) {
                handleRTCErr(err)
                return
              }
              var peer = new SimplePeer({ trickle: false, config: config })
              if (audioStream) peer._pc.addStream(audioStream)
              handleSignal(peer, true, room)
              peer.signal(JSON.parse(stringified.toString()))
            })
          })

          events.close()
        }

        events.onerror = function onError (e) {
          ui.inputs.copy.value = 'Error connecting. Please start over.'
          events.close()
        }
      }

      // try getusermedia and then upload sdp pong. this causes host to ping sdp back
      function getAudio (cb) {
        ui.inputs.paste.value = 'Please allow or deny voice chat...'
        getUserMedia({audio: true, video: false},
          function ok (stream) {
            cb(null, stream)
          },
          function error (err) {
            // screenshare even if remote doesnt wanna do audio
            if (err.name === 'PermissionDeniedError') {
              cb()
            } else {
              cb(err)
            }
          }
        )
      }
    }

    function hostPeer (config) {
      var peer
      ui.inputs.copy.value = 'Loading...'
      // create room
      nets({method: 'POST', uri: server + '/v1'}, function response (err, resp, body) {
        if (err) {
          ui.inputs.copy.value = 'Error! ' + err.message
          return
        }
        var room = JSON.parse(body)
        ui.inputs.copy.value = room.name

        // listen for pongs
        var events = new EventSource(server + '/v1/' + room.name + '/pongs')
        events.onmessage = function onMessage (e) {
          var row
          try {
            row = JSON.parse(e.data)
          } catch (e) {
            ui.inputs.copy.value = 'Error connecting. Please start over.'
            row = {}
          }

          // other side is ready
          if (row.ready) {
            connect(row.data)
          }

          // sdp from other side
          if (row.data) {
            inflate(row.data, function inflated (err, stringified) {
              if (err) {
                ui.inputs.copy.value = 'Error! Please Quit'
                return
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
                ui.inputs.copy.value = 'Waiting for other side...'
                handleSignal(peer, false, room.name)
              }, handleRTCErr)
            }, handleRTCErr)
          }
        }

        events.onerror = function onError (e) {
          ui.inputs.copy.value = 'Error connecting. Please start over.'
          events.close()
        }
      })
    }
  }

  function handleRTCErr (err) {
    if (err.name === 'PermissionDeniedError') {
      console.error('permission denied')
      console.error(err)
      throw new Error('SCREENSHARING PERMISSION DENIED')
    } else {
      console.error('unknown error')
      throw err
    }
  }

  function handleSignal (peer, remote, room) {
    window.PEER = peer // for debugging
    var queue = []

    peer.on('signal', function onSignal (sdp) {
      deflate(sdp, function deflated (err, data) {
        if (err) {
          ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
          return
        }

        if (!room) {
          var el
          if (remote) el = ui.inputs.paste
          else el = ui.inputs.copy
          el.value = 'Error! Please Quit'
          return
        }

        // upload sdp
        var uploadURL = server + '/v1/' + room
        if (remote) uploadURL += '/pong'
        else uploadURL += '/ping'

        nets({method: 'POST', json: {data: data}, uri: uploadURL}, function response (err, resp, body) {
          if (err) {
            if (remote) ui.inputs.paste.value = err.message
            else ui.inputs.copy.value = err.message
            return
          }
          if (resp.statusCode > 299) {
            if (remote) ui.inputs.paste.value = err.message
            else ui.inputs.copy.value = err.message
            return
          }
        })
      })
    })

    peer.on('stream', function (stream) {
      stream.getAudioTracks().forEach(function each (track) {
        renderAudio(stream)
      })
      stream.getVideoTracks().forEach(function each (track) {
        renderVideo(stream)
      })
    })

    if (peer.connected) onConnect()
    else peer.on('connect', onConnect)

    function onConnect () {
      if (connectedCb) connectedCb(peer, remote)
      app.show(ui.containers.video)
      app.hide(ui.containers.content)

      if (!remote) {
        app.show(ui.containers.sharing)

        peer.on('data', function (data) {
          console.log('got data', JSON.stringify(data))
          app.hide(ui.containers.content)
          queue.push(data)
          if (queue.length === 1) startQueue()
        })
        return
      }

      window.addEventListener('mousedown', mousedownListener)
      window.addEventListener('keydown', keydownListener)

      peer.on('close', function cleanup () {
        window.removeEventListener('mousedown', mousedownListener)
        window.removeEventListener('keydown', keydownListener)
        ui.containers.video.innerHTML = ''
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

  function renderVideo (stream) {
    video = document.createElement('video')
    video.src = window.URL.createObjectURL(stream)
    video.autoplay = true

    ui.containers.video.appendChild(video)
    app.hide(ui.containers.video)
  }

  function renderAudio (stream) {
    var audio = document.createElement('audio')
    audio.src = window.URL.createObjectURL(stream)
    audio.autoplay = true

    ui.containers.video.appendChild(audio)
    app.hide(ui.containers.video)
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

  function show (ele) {
    if (!ele) return
    ele.classList.remove('dn')
  }

  function hide (ele) {
    if (!ele) return
    ele.classList.add('dn')
    ele.classList.remove('db')
  }
}
