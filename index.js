var createApp = require('./create.js')

var ipc = require('ipc')
var clipboard = require('clipboard')
var shell = require('shell')

var peer

var app = createApp({}, function connected (newPeer, isRemote) {
  if (isRemote) ipc.send('resize', {width: 800, height: 500})
  peer = newPeer

  peer.on('error', function error (err) {
    console.error('peer error')
    console.error(err)
    app.ui.containers.content.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    showChoose()
  })
})

app.ui.buttons.quit.addEventListener('click', function (e) {
  ipc.send('terminate')
})

app.ui.buttons.destroy.addEventListener('click', function (e) {
  if (peer) peer.destroy()
  showChoose()
})

app.ui.buttons.share.addEventListener('click', function (e) {
  app.show(app.ui.containers.share)
  app.hide(app.ui.containers.choose)
  app.show(app.ui.buttons.back)
  if (!app.robot) app.robot = require('./robot.js')
  app.startHandshake(false)
})

app.ui.buttons.join.addEventListener('click', function (e) {
  app.show(app.ui.containers.join)
  app.hide(app.ui.containers.choose)
  app.show(app.ui.buttons.back)
  var remote = true
  app.startHandshake(remote)
})

app.ui.buttons.back.addEventListener('click', function (e) {
  // HACK do a clone-swap to remove listeners
  var el = ui.buttons.paste
  var elClone = el.cloneNode(true)
  el.parentNode.replaceChild(elClone, el)
  
  showChoose()
})

app.ui.buttons.copy.addEventListener('click', function (e) {
  e.preventDefault()
  clipboard.writeText(app.ui.inputs.copy.value)
})

function showChoose () {
  app.hide(app.ui.containers.sharing)
  app.hide(app.ui.containers.video)
  app.show(app.ui.containers.content)
  app.show(app.ui.containers.choose)
  app.hide(app.ui.containers.share)
  app.hide(app.ui.containers.join)
  app.hide(app.ui.buttons.back)
}

var externalLinks = document.querySelectorAll('.open-externally')
for (var i = 0; i < externalLinks.length; i++) {
  externalLinks[i].onclick = function (e) {
    e.preventDefault()
    shell.openExternal(e.target.href)
    return false
  }
}
