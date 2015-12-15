var ipc = require('ipc')
var clipboard = require('clipboard')
var shell = require('shell')
var desktopCapturer = require('desktop-capturer')

var domify = require('domify')
var mdns = require('multicast-dns')()
var createPeerConnection = require('./peer.js')
var ui = require('./ui.js')
var connect = require('./connect.js')

var peer
var peerConnection = createPeerConnection()
window.ui = ui
window.pc = peerConnection

mdns.on('query', function (query) {
  if (!ui.inputs.copy.value) return
  query.questions.forEach(function (q) {
    if (q.type === 'TXT' && q.name === 'screencat') {
      mdns.respond([{type: 'TXT', name: 'screencat', data: ui.inputs.copy.value}])
    }
  })
})

mdns.on('response', function (res) {
  res.answers.forEach(function (a) {
    if (a.type === 'TXT' && a.name === 'screencat') {
      ui.buttons.mdns.innerText = a.data
      ui.show(ui.containers.mdns)
    }
  })
})

peerConnection.on('connected', function connected (newPeer, remote) {
  peer = newPeer

  if (!remote) {
    ipc.send('icon', 'connected')
    ui.show(ui.containers.sharing)
    ui.hide(ui.containers.content)
  } else {
    ui.show(ui.containers.multimedia)
    ui.hide(ui.containers.content)
  }

  peer.on('error', function error (err) {
    ipc.send('icon', 'disconnected')
    console.error('peer error')
    console.error(err)
    ui.containers.content.innerHTML = 'Error connecting! Please Quit. ' + err.message
  })

  peer.on('close', function close () {
    ipc.send('icon', 'disconnected')
    showChoose()
  })
})

ipc.on('open-url', function (lnk) {
  console.log('open url', lnk)
})

ipc.on('connected', function () {
  ui.hide(ui.containers.content)
  ui.show(ui.containers.viewing)
})

ipc.on('disconnected', function () {
  console.log('disconnected')
  showChoose()
})

ui.buttons.quit.addEventListener('click', function (e) {
  ipc.send('terminate')
})

ui.buttons.destroy.addEventListener('click', function (e) {
  if (peer) peer.destroy()
  showChoose()
})

ui.buttons.share.addEventListener('click', function (e) {
  ui.hide(ui.containers.choose)
  ui.show(ui.buttons.back)
  try {
    if (!peerConnection.robot) peerConnection.robot = require('./robot.js')
  } catch (e) {
    error(new Error('./robot.js failed to load'))
    error(e)
  }
  desktopCapturer.getSources({types: ['window', 'screen']}, function (err, sources) {
    if (err) return error(err)
    ui.hide(ui.containers.choose)
    ui.show(ui.containers.capturer)
    var sourcesList = document.querySelector('.capturer-list')
    var id = 0
    sources.forEach(function (source) {
      var thumb = source.thumbnail.toDataUrl()
      if (!thumb) return
      var title = source.name.slice(0, 20)
      var item = `<li><a href="#"><img src="${thumb}"><span>${title}</span></a></li>`
      sourcesList.appendChild(domify(item))
      id++
    })
    var links = sourcesList.querySelectorAll('a')
    for (var i = 0; i < links.length; i++) {
      links[i].onclick = closure(i)
      function closure (i) {
        return function (e) {
          e.preventDefault()
          var source = sources[i]
          var opts = {
            constraints: {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id,
                  maxWidth: screen.availWidth,
                  maxHeight: screen.availHeight,
                  maxFrameRate: 25
                }
              }
            }
          }
          ui.show(ui.containers.share)
          ui.hide(ui.containers.capturer)
          sourcesList.innerHTML = ""
          connect.host(peerConnection, ui, opts)
          return false
        }
      }
    }
  })
})

ui.buttons.mdns.addEventListener('click', function (e) {
  ui.inputs.paste.value = ui.buttons.mdns.innerText.trim()
  ui.buttons.paste.click()
})

ui.buttons.join.addEventListener('click', function (e) {
  ui.inputs.copy.value = ''
  ui.hide(ui.containers.mdns)
  ui.show(ui.containers.join)
  ui.hide(ui.containers.choose)
  ui.show(ui.buttons.back)

  var interval = setInterval(query, 1000)
  query()

  connect.verifyUserRoom(peerConnection, ui, function (err, room, config) {
    clearInterval(interval)
    if (err) {
      ui.inputs.paste.value = 'Error! ' + err.message
      return
    }
    ui.inputs.paste.value = 'Waiting on other side...'
    ipc.send('create-window', {config: config, room: room})
  })

  function query () {
    mdns.query([{type: 'TXT', name: 'screencat'}])
  }
})

ui.buttons.back.addEventListener('click', function (e) {
  // HACK do a clone-swap to remove listeners
  var el = ui.buttons.paste
  var elClone = el.cloneNode(true)
  el.parentNode.replaceChild(elClone, el)
  ui.buttons.paste = elClone

  showChoose()
})

ui.buttons.copy.addEventListener('click', function (e) {
  e.preventDefault()
  clipboard.writeText(ui.inputs.copy.value)
})

ui.buttons.show.addEventListener('click', function (e) {
  e.preventDefault()
  ipc.send('show-window')
})

ui.buttons.stopViewing.addEventListener('click', function (e) {
  e.preventDefault()
  ipc.send('stop-viewing')
})

function showChoose () {
  ui.hide(ui.containers.viewing)
  ui.hide(ui.containers.sharing)
  ui.hide(ui.containers.multimedia)
  ui.show(ui.containers.content)
  ui.show(ui.containers.choose)
  ui.hide(ui.containers.share)
  ui.hide(ui.containers.join)
  ui.hide(ui.buttons.back)
}

var externalLinks = document.querySelectorAll('.open-externally')
for (var i = 0; i < externalLinks.length; i++) {
  externalLinks[i].onclick = function (e) {
    e.preventDefault()
    shell.openExternal(e.target.href)
    return false
  }
}

function error (e) {
  // TODO: Display this as a site flash in addition to the app console
  ipc.send('error', {message: e.message, name: e.name})
  console.error(e)
}
