module.exports.remote = function (app, ui) {
  app.getRemoteConfig(function (err, config) {
    if (err) return ui.inputs.paste.value = 'Error! ' + err.message
    ui.inputs.paste.value = ''

    // first, wait for user to enter room name
    ui.buttons.paste.addEventListener('click', onJoinClick)

    function onJoinClick (e) {
      e.preventDefault()
      var room = ui.inputs.paste.value
      ui.inputs.paste.value = 'Connecting...'
      if (!room) return
      app.verifyRoom(room, function (err) {
        if (err) return ui.inputs.paste.value = 'Error! ' + err.message
        ui.inputs.paste.value = 'Waiting on other side...'
        app.remotePeer(config, room, function (err, peer) {
          if (err) return ui.inputs.paste.value = 'Error! ' + err.message
        
          if (!room) {
            ui.inputs.paste.value = 'Error! Please Quit'
            return
          }
        
          peer.on('stream', function (stream) { renderStreams(app, ui, stream) })
          
          peer.on('signal', function (sdp) {
            app.handleSignal(sdp, peer, true, room, function (err) {
              if (err) return ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
              console.log('SDP POST DONE')
            })
          })
        
          if (peer.connected) app.onConnect(peer, true)
          else peer.on('connect', function () { app.onConnect(peer, true) })
        })
      })
    }
  })
}

module.exports.host = function (app, ui) {
  app.getRemoteConfig(function (err, config) {
    if (err) return ui.inputs.copy.value = 'Error! ' + err.message
    app.createRoom(function (err, room) {
      if (err) return ui.inputs.copy.value = 'Error! ' + err.message
      ui.inputs.copy.value = room
      app.hostPeer(room, config, function (err, peer) {
        if (err) return ui.inputs.copy.value = 'Error! ' + err.message
    
        if (!room) {
          ui.inputs.copy.value = 'Error! Please Quit'
          return
        }
    
        peer.on('stream', function (stream) { renderStreams(app, ui, stream) })
      
        peer.on('signal', function (sdp) {
          app.handleSignal(sdp, peer, false, room, function (err) {
            if (err) return ui.containers.content.innerHTML = 'Error! Please Quit. ' + err.message
          })
        })
    
        if (peer.connected) app.onConnect(peer, false)
        else peer.on('connect', function () { app.onConnect(peer, false) })
      })
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
