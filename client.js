
/**
 * Module dependencies.
 */

var dgram = require('dgram');
var sio = require('socket.io-client');
//var host = 'n8.io';
var host = '127.0.0.1';
var port = 8080;

/**
 * Constants.
 */

var NAVDATA_PORT = 5554;
var VIDEO_PORT   = 5555;
var AT_PORT      = 5556;

var udpSockets = {};

;[ NAVDATA_PORT, VIDEO_PORT, AT_PORT ].forEach(function (port) {
  var server = dgram.createSocket('udp4');

  server.on('message', function (msg, rinfo) {
    console.log('"message"', msg, rinfo);
    //console.log(0, msg.toString('binary'));
    var obj = {
      port: port,
      msg: msg.toString('binary')
      //rinfo: rinfo
    };
    socket.emit('udp', obj);
  });

  server.on("listening", function () {
    var address = server.address();
    console.log("UDP server listening " +
        address.address + ":" + address.port);
  });

  server.bind(); // bind to a random port

  udpSockets[port] = server;
});

/**
 * Connect to the socket.io server.
 */

var socket = sio.connect('http://' + host + ':' + port);

socket.on('connect', function () {
  console.error('socket connected!');
});

socket.on('udp', function (data) {
  console.error('"udp"', data);
  var msg = new Buffer(data.msg, 'binary');
  var port = data.port;
  var socket = udpSockets[port];
  socket.send(msg, 0, msg.length, port, host);
});

socket.on('disconnect', function () {
  console.error('socket disconnected!');
});
