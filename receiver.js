
/**
 * This script simulates a client sending UDP commands to the AR.Drone. This
 * script runs on the AR.Drone itself, and connects to the "relay server" and
 * waits for UDP messages from a "sender" on the other side.
 */

/**
 * Module dependencies.
 */

var net = require('net');
var dgram = require('dgram');
var sio = require('socket.io-client');

/**
 * Constants.
 */

var PORTS = require('./ports');

/**
 * Hostname of the "relay server". "n8.io" by default.
 */

var relayHost = process.env.RELAY_HOST || 'n8.io';

/**
 * TCP port of the "relay server". Port 8080 by default.
 */

var relayPort = parseInt(process.env.RELAY_PORT, 10) || 8080;

/**
 * Map of UDP clients and TCP sockets that will send messages to the
 * AR.Drone ports.
 */

var sockets = {};

/**
 * Create the UDP clients.
 */

Object.keys(PORTS).forEach(function (name) {
  var data = PORTS[name];
  if (data.type != 'udp') return;

  var port = data.port;
  var socket = dgram.createSocket('udp4');

  socket.on('message', function (msg, rinfo) {
    var obj = {
      port: port,
      msg: msg.toString('binary')
    };
    console.log('"message":', obj);
    io.emit('udp', obj);
  });

  socket.on('listening', function () {
    var address = socket.address();
    console.log('UDP client listening %s:%s', address.address, address.port);
  });

  // bind to a random UDP port
  socket.bind();

  sockets[port] = socket;
});

/**
 * Connect to the "relay server".
 */

var io = sio.connect('http://' + relayHost + ':' + relayPort);

// we're the "receiver client"
io.emit('mode', 'receiver');

io.on('connect', function () {
  console.log('"relay server" connected!');
});

io.on('udp', function (data) {
  console.log('"udp"', data);

  // construct a Buffer for the UDP packet
  var msg = new Buffer(data.msg, 'binary');

  // get the UDP server that will send the UDP packet
  var port = data.port;
  var server = sockets[port];

  // relay the packet to the specified AR.Drone UDP port
  server.send(msg, 0, msg.length, port, '127.0.0.1');
});

io.on('disconnect', function () {
  console.log('socket disconnected!');
});
