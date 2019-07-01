// var util = require('util'),
//     EventEmitter = require('events');
//
// function Ev () {
//     EventEmitter.call(this)
// }
// util.inherits(Ev, EventEmitter);
// Ev.prototype.emi = function (m,msg) {
//     this.emit(m, {msg:msg});
// };
var EventEmitter = require('events').EventEmitter;

module.exports = new EventEmitter();

exports.emit = function(m){

    module.exports.emit(m);

}