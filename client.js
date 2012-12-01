
/**
 * Module dependencies.
 */

var dgram = require('dgram');
var sio = require('socket.io-client');
var arHost = process.env.AR_HOST || '127.0.0.1';
var relayHost = process.env.RELAY_HOST || 'n8.io';
var port = 8080;

/**
 * Constants.
 */

var PORTS = {
  FTP: 5551,
  AUTH: 5552,
  VIDEO_RECORDER: 5553,
  NAVDATA: 5554,
  VIDEO: 5555,
  AT: 5556,
  RAW_CAPTURE: 5557,
  PRINTF: 5558,
  CONTROL: 5559
};

var udpSockets = {};

Object.keys(PORTS).forEach(function (name) {
  var port = PORTS[name];
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

var socket = sio.connect('http://' + relayHost + ':' + port);

socket.on('connect', function () {
  console.error('socket connected!');
});

socket.on('udp', function (data) {
  console.error('"udp"', data);
  var msg = new Buffer(data.msg, 'binary');
  var port = data.port;
  var socket = udpSockets[port];

  // relay the packet to "localhost" at the specified UDP port
  socket.send(msg, 0, msg.length, port, arHost);
});

socket.on('disconnect', function () {
  console.error('socket disconnected!');
});
