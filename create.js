var zlib = require('zlib')

var SimplePeer = require('simple-peer')
var request = require('request')
var ssejson = require('ssejson')

module.exports = function create (opts, connected) {
  var DEV = process.env.LOCALDEV || false
  // var server = 'http://catlobby.maxogden.com'
  var server = 'http://localhost:5005'

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
    back: document.querySelector('.back-button')
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
        maxWidth: 1280,
        maxHeight: 720,
        maxFrameRate: 15
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
    if (remote) {
      var peer = new SimplePeer({ trickle: false })
      console.log('client peer')
      handleSignal(peer, remote)
    } else {
      navigator.webkitGetUserMedia(constraints, function (stream) {
        var peer = new SimplePeer({ initiator: true, stream: stream, trickle: false })
        console.log('host peer', peer)
        ui.inputs.copy.value = 'Loading...'
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
          ui.containers.content.innerHTML = 'Error! Please Quit'
          return
        }
        var connectionString = deflated.toString('base64')
        var code = encodeURIComponent(connectionString)
        console.log('sdp length', code.length)

        // upload pong sdp
        if (remote) {
          if (!pingName) {
            ui.inputs.paste.value = 'Error! Please Quit'
            return
          }
          request.post({body: code, uri: server + '/pong/' + pingName}, function resp (err, resp, body) {
            if (err) {
              ui.inputs.paste.value = err.message
              return
            }
          })
        }

        // upload initial sdp
        if (!remote) {
          request.post({body: code, uri: server + '/ping'}, function resp (err, resp, body) {
            if (err) {
              ui.inputs.copy.value = 'Error! ' + err.message
              return
            }
            var ping = JSON.parse(body)
            ui.inputs.copy.value = ping.name

            // listen for sdp pongs
            var req = request(server + '/pongs/' + ping.name)
              .pipe(ssejson.parse())
              .on('data', function data (pong) {
                console.log('pong sdp length', pong.length)
                inflate(pong, function inflated (err, stringified) {
                  if (err) {
                    ui.inputs.copy.value = 'Error! Please Quit'
                    return
                  }
                  peer.signal(JSON.parse(stringified.toString()))
                  req.end()
                })
              })
              .on('error', function error (err) {
                ui.inputs.copy.value = err.message
              })
          })
        }
      })
    })

    ui.buttons.paste.addEventListener('click', function (e) {
      console.log('paste button click')
      e.preventDefault()
      var ping = ui.inputs.paste.value
      ui.inputs.paste.value = 'Connecting...'
      if (!ping) return
      request({uri: server + '/ping/' + ping}, function resp (err, resp, data) {
        if (err) {
          ui.inputs.paste.value = 'Error! ' + err.message
          return
        }
        if (resp.statusCode !== 200) return ui.inputs.paste.value = "Invalid or expired invite code"
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
      app.hide(ui.containers.content)
      if (app.robot) app.robot(data)
    })

    if (peer.connected) onConnect()
    else peer.on('connect', onConnect)

    function onConnect () {
      if (connected) connected(peer, remote)
      app.show(ui.containers.video)
      app.hide(ui.containers.content)
      if (!remote) {
        app.show(ui.containers.sharing)
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
      ui.containers.video.appendChild(video)
      app.hide(ui.containers.video)
    })
  }

  function show (ele) {
    ele.classList.remove('dn')
  }

  function hide (ele) {
    ele.classList.add('dn')
    ele.classList.remove('db')
  }
}
