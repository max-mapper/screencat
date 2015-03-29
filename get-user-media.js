module.exports = function () {
  var getUserMedia = (
    window.navigator.getUserMedia ||
    window.navigator.webkitGetUserMedia ||
    window.navigator.mozGetUserMedia ||
    window.navigator.msGetUserMedia
  )
  if (!getUserMedia) return
  return getUserMedia.bind(window.navigator)
}
