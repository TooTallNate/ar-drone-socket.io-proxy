
/**
 * This script simulates an AR.Drone UDP interface, running on localhost, and
 * proxies all UDP action to the "relay server", and waits for any "udp" socket.io
 * messages coming in from the "relay server" to relay back to the original
 * sender.
 */

/**
 * Module dependencies.
 */

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
 * Map of UDP servers bound to the AR.Drone UDP ports.
 */

var udpSockets = {};

/**
 * Create the UDP servers.
 */

Object.keys(PORTS).forEach(function (name) {
  var port = PORTS[name];
  var server = dgram.createSocket('udp4');

  server.on('message', function (msg, rinfo) {
    var obj = {
      port: port,
      msg: msg.toString('binary')
    };
    console.log('"message":', obj, rinfo);
    socket.emit('udp', obj);

    // save the return info so we know who to send UDP packets back to
    server.lastRinfo = rinfo;
  });

  server.on('listening', function () {
    var address = server.address();
    console.log('UDP server listening %s:%s', address.address, address.port);
  });

  // bind to the AR.Drone port
  server.bind(port);

  udpSockets[port] = server;
});

/**
 * Connect to the "relay server".
 */

var socket = sio.connect('http://' + relayHost + ':' + relayPort);

// we're the "sender client"
socket.emit('mode', 'sender');

socket.on('connect', function () {
  console.log('"relay server" connected!');
});

socket.on('udp', function (data) {
  console.log('"udp"', data);

  // construct a Buffer for the UDP packet
  var msg = new Buffer(data.msg, 'binary');

  // get the UDP server that will send the UDP packet
  var port = data.port;
  var server = udpSockets[port];

  // relay the packet back to the UDP port that we last heard from on this port
  var returnAddress = server.lastRinfo.address;
  var returnPort = server.lastRinfo.port;
  console.log('sending back to %j %j', returnAddress, returnPort);
  server.send(msg, 0, msg.length, returnPort, returnAddress);
});

socket.on('disconnect', function () {
  console.log('socket disconnected!');
});
