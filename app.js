var path = require('path')
var menubar = require('menubar')
var ipc = require('ipc')

var mb = menubar({
  width: 700,
  height: 300,
  index: 'file://' + path.join(process.cwd(), 'app.html'),
  icon: 'file://' + path.join(process.cwd(), 'img', 'Icon.png')
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
