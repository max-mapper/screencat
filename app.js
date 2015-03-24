var menubar = require('menubar')
var ipc = require('ipc')

var mb = menubar()

mb.on('ready', function ready () {
  console.log('ready')
  
  mb.on('after-show', sendPosition)
  mb.on('after-create-window', sendPosition)
  
  ipc.on('resize', sendPosition)
  
  function sendPosition() {
    console.log('send pos')
    var pos = mb.window.getPosition()
    mb.window.webContents.send('window-position', {x: pos[0], y: pos[1]})
  }
})