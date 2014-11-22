// TODO handle emoji
// TODO fix cursor position

var on = require('component-delegate').bind
var keysim = require('keysim')
var keyboard = keysim.Keyboard.US_ENGLISH

module.exports = function(opts) {
  if (!opts) opts = {}
  on(opts.container || document.body, opts.selector || '*', 'keypress', handleKeypress)  
  on(opts.container || document.body, opts.selector || '*', 'keydown', handleKeydown)
  
  function handleKeypress(e) {
    if (!keyboard.targetCanReceiveTextInput(e.target)) return true
    var el = e.target
    var first = el.value.slice(0, el.selectionStart)
    var rest = el.value.slice(el.selectionEnd, el.value.length)
    el.value = [first, String.fromCharCode(e.keyCode), rest].join('')
    e.preventDefault()
    return false
  }
  
  function handleKeydown(e) {
    if (!keyboard.targetCanReceiveTextInput(e.target)) return true
    if (e.keyCode !== 8) return true
    var el = e.target
    var first = el.value.slice(0, el.selectionStart)
    var rest = el.value.slice(el.selectionEnd, el.value.length)  
    if (el.selectionEnd > el.selectionStart) {
      el.value = [first, rest].join('')
    } else if (e.metaKey) {
      var lines = el.value.split(/\r?\n/)
      el.value = lines.slice(0, lines.length - 1).join('\n')
    } else if (e.altKey) {
      var words = [first, rest].join('').split(' ')
      el.value = words.slice(0, words.length - 1).join(' ')
    } else {
      el.value = [first.slice(0, first.length - 1), rest].join('')
    }
    e.preventDefault()
    return false
  }
}

