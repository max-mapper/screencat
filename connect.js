module.exports.verifyUserRoom = function (peerConnection, ui, cb) {
  peerConnection.getRemoteConfig(function (err, config) {
    if (err) return cb(err)
    ui.inputs.paste.value = ''

    // first, wait for user to enter room name
    ui.buttons.paste.addEventListener('click', onJoinClick)

    function onJoinClick (ev) {
      ev.preventDefault()
      var room = ui.inputs.paste.value
      ui.inputs.paste.value = 'Connecting...'
      if (!room) return
      peerConnection.verifyRoom(room, function (err) {
        cb(err, room, config)
      })
    }
  })
}

module.exports.remote = function (peerConnection, ui, room, config) {
  peerConnection.remotePeer(config, room, function (err, peer) {
    if (err) {
      ui.inputs.paste.value = 'Error! ' + err.message
      return
    }

    if (!room) {
      ui.inputs.paste.value = 'Error! Please Quit'
      return
    }

    peer.on('stream', function (stream) { renderStreams(peerConnection, ui, stream) })

    peer.on('signal', function (sdp) {
      peerConnection.handleSignal(sdp, peer, true, room, function (err) {
        if (err) {
          ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
          return
        }
        console.log('SDP POST DONE')
      })
    })

    if (peer.connected) peerConnection.onConnect(peer, true)
    else peer.on('connect', function () { peerConnection.onConnect(peer, true) })
  })
}

module.exports.host = function (peerConnection, ui) {
  getARoom(peerConnection, ui, function (err, room, config) {
    ui.inputs.copy.value = room
    peerConnection.hostPeer(room, config, function (err, peer) {
      if (err) {
        ui.inputs.copy.value = 'Error! ' + err.message
        return
      }

      if (!room) {
        ui.inputs.copy.value = 'Error! Please Quit'
        return
      }

      peer.on('stream', function (stream) { renderStreams(peerConnection, ui, stream) })

      peer.on('signal', function (sdp) {
        peerConnection.handleSignal(sdp, peer, false, room, function (err) {
          if (err) {
            ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
            return
          }
        })
      })

      if (peer.connected) peerConnection.onConnect(peer, false)
      else peer.on('connect', function () { peerConnection.onConnect(peer, false) })
    })    
  })
}

function renderStreams (peerConnection, ui, stream) {
  stream.getAudioTracks().forEach(function each (track) {
    var audio = peerConnection.audioElement(stream)
    ui.containers.multimedia.appendChild(audio)
    ui.hide(ui.containers.multimedia)
  })
  stream.getVideoTracks().forEach(function each (track) {
    var video = peerConnection.videoElement(stream)
    ui.containers.multimedia.appendChild(video)
    ui.hide(ui.containers.multimedia)
  })
}

function getARoom (peerConnection, ui, cb) {
  peerConnection.getRemoteConfig(function (err, config) {
    if (err) return cb(err)
    peerConnection.createRoom(function(err, room) {
      cb(err, room, config)
    })
  })
}
