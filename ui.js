var ui = {}

module.exports = ui

ui.show = show
ui.hide = hide

ui.containers = {
  share: document.querySelector('.share-container'),
  join: document.querySelector('.join-container'),
  content: document.querySelector('.content-container'),
  choose: document.querySelector('.choose-container'),
  multimedia: document.querySelector('.multimedia-container'),
  sharing: document.querySelector('.sharing-container'),
  viewing: document.querySelector('.viewing-container'),
  mdns: document.querySelector('.code-mdns')
}

ui.buttons = {
  share: document.querySelector('.share-button'),
  join: document.querySelector('.join-button'),
  copy: document.querySelector('.code-copy-button'),
  paste: document.querySelector('.code-paste-button'),
  quit: document.querySelector('.quit-button'),
  back: document.querySelector('.back-button'),
  destroy: document.querySelector('.sharing-container .destroy-button'),
  stopViewing: document.querySelector('.viewing-container .destroy-button'),
  show: document.querySelector('.viewing-container .show-button'),
  mdns: document.querySelector('.code-mdns-button')
}

ui.inputs = {
  copy: document.querySelector('.code-copy-input'),
  paste: document.querySelector('.code-paste-input')
}

function show (ele) {
  if (!ele) return
  ele.classList.remove('dn')
}

function hide (ele) {
  if (!ele) return
  ele.classList.add('dn')
  ele.classList.remove('db')
}
