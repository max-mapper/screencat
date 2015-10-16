var path = require('path')
var menubar = require('menubar')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')

var mb = menubar({
  width: 700,
  height: 300,
  index: 'file://' + path.join(__dirname, 'app.html'),
  icon: 'file://' + path.join(__dirname, 'img', 'Icon.png')
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

ipc.on('create-window', function (ev, config) {
  console.log('create-window', [config])
  var win = new BrowserWindow({})
  win.loadUrl('file://' + path.join(__dirname, 'screen.html'))
  ipc.once('window-ready', function () {
    win.webContents.openDevTools()
    win.webContents.send('peer-config', config)
  })
})
