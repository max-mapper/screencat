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
  mb.app.dock.show()
  var win = new BrowserWindow({width: 720, height: 445})
  win.loadUrl('file://' + path.join(__dirname, 'screen.html'))

  win.on('closed', function () {
    mb.app.dock.hide()
    mb.window.webContents.send('disconnected', true)
  })

  ipc.once('window-ready', function () {
    // win.webContents.openDevTools()
    win.webContents.send('peer-config', config)
  })

  ipc.on('connected', function () {
    mb.window.webContents.send('connected', true)
  })

  ipc.on('disconnected', function () {
    mb.window.webContents.send('disconnected', true)
  })

  ipc.on('show-window', function () {
    win.show()
  })

  ipc.on('stop-viewing', function () {
    win.close()
    mb.window.webContents.send('disconnected', true)
  })
})
