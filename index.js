var ipc = require('ipc')
var clipboard = require('clipboard')
var shell = require('shell')

var createApp = require('./create.js')
var ui = require('./ui.js')
var connect = require('./connect.js')

var peer
var app = createApp()

app.on('connected', function connected (newPeer, remote) {
  peer = newPeer
  
  if (!remote) {
    ui.show(ui.containers.sharing)
    ui.hide(ui.containers.content)
  } else {
    ipc.send('resize', {width: 800, height: 500})
    ui.show(ui.containers.multimedia)
    ui.hide(ui.containers.content)
  }

  peer.on('error', function error (err) {
    console.error('peer error')
    console.error(err)
    ui.containers.content.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    showChoose()
  })
})

ui.buttons.quit.addEventListener('click', function (e) {
  ipc.send('terminate')
})

ui.buttons.destroy.addEventListener('click', function (e) {
  if (peer) peer.destroy()
  showChoose()
})

ui.buttons.share.addEventListener('click', function (e) {
  ui.show(ui.containers.share)
  ui.hide(ui.containers.choose)
  ui.show(ui.buttons.back)
  if (!app.robot) app.robot = require('./robot.js')
  connect.host(app, ui)
})

ui.buttons.join.addEventListener('click', function (e) {
  ui.show(ui.containers.join)
  ui.hide(ui.containers.choose)
  ui.show(ui.buttons.back)
  connect.remote(app, ui)
})

ui.buttons.back.addEventListener('click', function (e) {
  // HACK do a clone-swap to remove listeners
  var el = ui.buttons.paste
  var elClone = el.cloneNode(true)
  el.parentNode.replaceChild(elClone, el)
  ui.buttons.paste = elClone

  showChoose()
})

ui.buttons.copy.addEventListener('click', function (e) {
  e.preventDefault()
  clipboard.writeText(ui.inputs.copy.value)
})

function showChoose () {
  ui.hide(ui.containers.sharing)
  ui.hide(ui.containers.multimedia)
  ui.show(ui.containers.content)
  ui.show(ui.containers.choose)
  ui.hide(ui.containers.share)
  ui.hide(ui.containers.join)
  ui.hide(ui.buttons.back)
}

var externalLinks = document.querySelectorAll('.open-externally')
for (var i = 0; i < externalLinks.length; i++) {
  externalLinks[i].onclick = function (e) {
    e.preventDefault()
    shell.openExternal(e.target.href)
    return false
  }
}
