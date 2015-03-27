var createApp = require('./create.js')

var ipc = require('ipc')
var clipboard = require('clipboard')

var app = createApp({}, function connected (peer, isRemote) {
  if (isRemote) ipc.send('resize', {width: 800, height: 500})
})

app.ui.buttons.quit.addEventListener('click', function (e) {
  ipc.send('terminate')
})

app.ui.buttons.share.addEventListener('click', function (e) {
  app.ui.containers.share.classList.add('db')
  app.hide(app.ui.containers.choose)
  app.show(app.ui.buttons.back)
  app.robot = require('./robot.js')
  app.startHandshake(false)
})

app.ui.buttons.join.addEventListener('click', function (e) {
  app.ui.containers.join.classList.add('db')
  app.hide(app.ui.containers.choose)
  app.show(app.ui.buttons.back)
  var remote = true
  app.startHandshake(remote)
})

app.ui.buttons.back.addEventListener('click', function (e) {
  app.show(app.ui.containers.choose)
  app.hide(app.ui.containers.share)
  app.hide(app.ui.containers.join)
  app.hide(app.ui.buttons.back)
})

app.ui.buttons.copy.addEventListener('click', function (e) {
  e.preventDefault()
  clipboard.writeText(app.ui.inputs.copy.value)
})
