var createApp = require('./create.js')

var app = createApp({}, function connected (peer, isRemote) {
  app.ui.inputs.paste.value = ''

  peer.on('error', function error (err) {
    console.error('peer error')
    console.error(err)
    app.hide(app.ui.containers.video)
    app.show(app.ui.containers.content)
    app.ui.containers.join.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    app.hide(app.ui.containers.video)
    app.show(app.ui.containers.content)
    app.ui.containers.join.innerHTML = 'The remote user ended the sharing session.'
  })
})

app.ui.buttons.back.addEventListener('click', function (e) {
  showChoose()
})

function showChoose () {
  app.show(app.ui.containers.choose)
  app.hide(app.ui.containers.share)
  app.hide(app.ui.containers.join)
  app.hide(app.ui.buttons.back)
}

function initialize () {
  app.ui.inputs.paste.value = 'Loading...'
  var remote = true
  app.startHandshake(remote)
}

initialize()
