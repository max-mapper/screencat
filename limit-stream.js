var through = require('through2')

module.exports = function limiter (limit) {
  var stream = through(write)
  
  var len = 0
  
  return stream
  
  function write (ch, enc, next) {
    if (Buffer.isBuffer(ch)) len += ch.length
    else len += 1

    if (len >= limit) this.destroy(new Error('Limit exceeded'))
    else this.push(ch)

    next()
  }
}
