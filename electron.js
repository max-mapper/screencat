var path = require('path')
var menubar = require('menubar')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')

var icons = {
  connected: path.join(__dirname, 'img', 'IconRed.png'),
  disconnected: path.join(__dirname, 'img', 'Icon.png')
}

var mb = menubar({
  width: 445,
  height: 335,
  index: 'file://' + path.join(__dirname, 'app.html'),
  icon: 'file://' + icons.disconnected
})

var win

mb.app.commandLine.appendSwitch('disable-renderer-backgrounding')

mb.on('ready', function ready () {
  console.log('ready')
})

ipc.on('icon', function (ev, key) {
  mb.tray.setImage(icons[key])
})

mb.app.on('open-url', function (e, lnk) {
  e.preventDefault()
  if (mb.window) mb.window.webContents.send('open-url', lnk)
})

ipc.on('terminate', function terminate (ev) {
  mb.app.terminate()
})

ipc.on('resize', function resize (ev, data) {
  mb.window.setSize(data.width, data.height)
})

ipc.on('error', function error (ev, err) {
  console.error(new Error(err.message))
})

ipc.on('create-window', function (ev, config) {
  console.log('create-window', [config])
  mb.app.dock.show()
  win = new BrowserWindow({width: 720, height: 445})
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
