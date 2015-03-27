var menubar = require('menubar')
var ipc = require('ipc')

var mb = menubar({
  dir: __dirname,
  width: 780,
  height: 480
})

mb.on('ready', function ready () {
  console.log('ready')
})

ipc.on('terminate', function terminate (ev) {
  mb.app.terminate()
})
