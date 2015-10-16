var createApp = require('./create.js')
var app = createApp()
var ui = require('./ui.js')
var connect = require('./connect.js')

ui.inputs.paste.value = 'Loading...'
connect.remote(app, ui)

app.on('connected', function connected (peer) {
  ui.inputs.paste.value = ''
  ui.show(ui.containers.multimedia)
  ui.hide(ui.containers.content)

  peer.on('error', function error (err) {
    console.error('peer error')
    console.error(err)
    ui.hide(ui.containers.multimedia)
    ui.show(ui.containers.content)
    ui.containers.join.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    ui.hide(ui.containers.multimedia)
    ui.show(ui.containers.content)
    ui.containers.join.innerHTML = 'The remote user ended the sharing session.'
    ui.containers.multimedia.innerHTML = ''
  })
})

ui.buttons.back.addEventListener('click', function (e) {
  showChoose()
})

app.on('getting-audio', function () {
  ui.inputs.paste.value = 'Please allow or deny voice chat...'
})

app.on('waiting-for-peer', function () {
  ui.inputs.paste.value = 'Waiting for other side...'
})

function showChoose () {
  ui.show(ui.containers.choose)
  ui.hide(ui.containers.share)
  ui.hide(ui.containers.join)
  ui.hide(ui.buttons.back)
}
