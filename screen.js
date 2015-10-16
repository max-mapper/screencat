var ipc = require('ipc')
var createPeerConnection = require('./peer.js')
var ui = require('./ui.js')
var connect = require('./connect.js')

var peerConnection = createPeerConnection()

ipc.send('window-ready', true)

ipc.on('peer-config', function (config) {
  connect.remote(peerConnection, ui, config.config, config.room)
})

peerConnection.on('connected', function connected (peer) {
  ui.show(ui.containers.multimedia)
  ui.hide(ui.containers.content)

  peer.on('error', function error (err) {
    console.error('peer error')
    console.error(err)
    ui.containers.content.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    console.log('closed')
  })
})
