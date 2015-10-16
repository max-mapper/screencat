module.exports.verifyUserRoom = function (app, ui, cb) {
  app.getRemoteConfig(function (err, config) {
    if (err) return cb(err)
    ui.inputs.paste.value = ''

    // first, wait for user to enter room name
    ui.buttons.paste.addEventListener('click', onJoinClick)

    function onJoinClick (ev) {
      ev.preventDefault()
      var room = ui.inputs.paste.value
      ui.inputs.paste.value = 'Connecting...'
      if (!room) return
      app.verifyRoom(room, function (err) {
        cb(err, room, config)
      })
    }
  })
}

module.exports.remote = function (app, ui, room, config) {
  app.remotePeer(config, room, function (err, peer) {
    if (err) {
      ui.inputs.paste.value = 'Error! ' + err.message
      return
    }

    if (!room) {
      ui.inputs.paste.value = 'Error! Please Quit'
      return
    }

    peer.on('stream', function (stream) { renderStreams(app, ui, stream) })

    peer.on('signal', function (sdp) {
      app.handleSignal(sdp, peer, true, room, function (err) {
        if (err) {
          ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
          return
        }
        console.log('SDP POST DONE')
      })
    })

    if (peer.connected) app.onConnect(peer, true)
    else peer.on('connect', function () { app.onConnect(peer, true) })
  })
}

module.exports.host = function (app, ui) {
  getARoom(app, ui, function (err, room, config) {
    ui.inputs.copy.value = room
    app.hostPeer(room, config, function (err, peer) {
      if (err) {
        ui.inputs.copy.value = 'Error! ' + err.message
        return
      }

      if (!room) {
        ui.inputs.copy.value = 'Error! Please Quit'
        return
      }

      peer.on('stream', function (stream) { renderStreams(app, ui, stream) })

      peer.on('signal', function (sdp) {
        app.handleSignal(sdp, peer, false, room, function (err) {
          if (err) {
            ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
            return
          }
        })
      })

      if (peer.connected) app.onConnect(peer, false)
      else peer.on('connect', function () { app.onConnect(peer, false) })
    })    
  })
}

function renderStreams (app, ui, stream) {
  stream.getAudioTracks().forEach(function each (track) {
    var audio = app.audioElement(stream)
    ui.containers.multimedia.appendChild(audio)
    ui.hide(ui.containers.multimedia)
  })
  stream.getVideoTracks().forEach(function each (track) {
    var video = app.videoElement(stream)
    ui.containers.multimedia.appendChild(video)
    ui.hide(ui.containers.multimedia)
  })
}

function getARoom (app, ui, cb) {
  app.getRemoteConfig(function (err, config) {
    if (err) return cb(err)
    app.createRoom(function(err, room) {
      cb(err, room, config)
    })
  })
}
