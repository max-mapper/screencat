var createApp = require('./create.js')

var app = createApp()

app.ui.buttons.back.addEventListener('click', function (e) {
  app.show(app.ui.containers.choose)
  app.hide(app.ui.containers.share)
  app.hide(app.ui.containers.join)
  app.hide(app.ui.buttons.back)
})

var remote = true
app.startHandshake(remote)
