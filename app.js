var menubar = require('menubar')
var ipc = require('ipc')

var mb = menubar({
  dir: __dirname,
  width: 700,
  height: 300
})

mb.on('ready', function ready () {
  console.log('ready')
})

ipc.on('terminate', function terminate (ev) {
  mb.app.terminate()
})

ipc.on('resize', function resize (ev, data) {
  mb.window.setSize(data.width, data.height)
})
