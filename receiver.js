
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

var relayTcpPort = 8081;

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
    console.log('"message" on port %d from %s:%s (%d bytes)', obj.port, rinfo.address, rinfo.port, msg.length);
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
io.on('tcp connect', function (data) {
  // for every TCP connection opened, we need to open one locally against the
  // AR.Drone port and relay all related events back to the "relay server"
  console.log('"tcp connect"', data);
  var port = data.port;

  // create a TCP connection to the specified port to the AR.Drone (localhost)
  var socket = net.connect({ port: port }, function () {
    console.log('tcp "connect" event from port %d', port);
  });

  socket.on('data', function (data) {
    console.log('tcp "data" event from port %d (%d bytes)', port, data.length);
  });

  socket.on('end', function () {
    console.log('tcp "end" event from port %d', port);
  });

  socket.on('close', function () {
    console.log('tcp "close" event from port %d', port);
  });

  // create a TCP connection to the "relay server" TCP port
  var relaySocket = net.connect({ host: relayHost, port: relayTcpPort });

  // construct the "header"
  var header = new Buffer(3);
  header[0] = 1; // this is the "receiver"
  // tell the relay server what port to this socket is responding to
  header.writeUInt16BE(port, 1);
  relaySocket.write(header);

  // pipe ...
  socket.pipe(relaySocket);
  relaySocket.pipe(socket);

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


// DEBUG - run with `--expose_gc`
if ('function' == typeof gc) {
  // the AR.Drone keeps getting a "Killed" message when getting the TCP video
  // stream... Attempt to forcefully free memory once per second...
  var os = require('os');
  setInterval(function () {
    console.log('running gc()...');
    gc();

    var mem = process.memoryUsage();
    mem.freemem = os.freemem();
    mem.totalmem = os.totalmem();
    mem.freePercent = mem.freemem / mem.totalmem * 100;
    console.log('memory usage:', mem);
  }, 1000);
}
