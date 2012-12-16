
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
    console.log('"message" port %d (%d byes)', obj.port, msg.length);
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

// this is the "receiver client"
io.emit('mode', 'receiver');

// socket.io events
io.on('connect', function () {
  console.log('"relay server" connected!');
});

io.on('disconnect', function () {
  console.log('socket disconnected!');
});

// TCP-related events
io.on('tcp connect', function (address) {
  // for every TCP connection opened, we need to open one locally against the
  // AR.Drone port and relay all related events back to the "relay server"
  console.log('"tcp connect"', address);
  var port = address.target;
  var key = port + ':' + address.address + ':' + address.port;

  // create a TCP connection to the specified port to the AR.Drone (localhost)
  var socket = net.connect({ port: port }, function () {
    console.log('tcp "connect" event from port %d', port);
  });

  socket.on('data', function (data) {
    console.log('tcp "data" event from port %d (%d bytes)', port, data.length);
    io.emit('tcp data', {
      port: address.port,
      target: address.target,
      address: address.address,
      buf: data.toString('binary')
    });
    socket.pause();
    // resume upon socket.io "tcp writedone" event
  });

  socket.on('end', function () {
    console.log('tcp "end" event from port %d', port);
    io.emit('tcp end', address);
  });

  socket.on('close', function () {
    console.log('tcp "close" event from port %d', port);
    io.emit('tcp close', address);
  });

  // keep reference to TCP socket for "io" events
  sockets[key] = socket;
});

io.on('tcp data', function (data, fn) {
  // incoming data from one of the remote connected TCP sockets
  var port = data.target;
  var buf = new Buffer(data.buf, 'binary');
  console.log('"tcp data" from sender for port %d (%d bytes)', data, buf.length);
  var key = port + ':' + data.address + ':' + data.port;
  var socket = sockets[key];
  try {
    socket.write(data, function () {
      console.log('done writing...', arguments);
      fn();
    });
  } catch (e) {
    console.error(e);
  }
});

io.on('tcp end', function (data) {
  console.log('"tcp end"', data);
  var port = data.target;
  var key = port + ':' + data.address + ':' + data.port;
  var socket = sockets[key];
  socket.end();
});

io.on('tcp close', function (data) {
  console.log('"tcp close"', data);
  var port = data.target;
  var key = port + ':' + data.address + ':' + data.port;
  var socket = sockets[key];
  socket.destroy();
});

io.on('tcp writedone', function (data) {
  console.log('"tcp writedone"', data);
  var port = data.target;
  var key = port + ':' + data.address + ':' + data.port;
  var socket = sockets[key];
  socket.resume();
});

// UDP-related events
io.on('udp', function (data) {

  // construct a Buffer for the UDP packet
  var msg = new Buffer(data.msg, 'binary');

  // get the UDP server that will send the UDP packet
  var port = data.port;
  var server = sockets[port];

  console.log('"udp" for port %d (%d bytes)', port, msg.length);

  // relay the packet to the specified AR.Drone UDP port
  server.send(msg, 0, msg.length, port, '127.0.0.1');
});
