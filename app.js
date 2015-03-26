var menubar = require('menubar')

var mb = menubar({
  dir: __dirname,
  width: 780,
  height: 480
})

mb.on('ready', function ready () {
  console.log('ready')
})
