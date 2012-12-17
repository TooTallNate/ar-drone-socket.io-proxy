
/**
 * This script simulates an AR.Drone UDP interface, running on localhost, and
 * proxies all UDP action to the "relay server", and waits for any "udp" socket.io
 * messages coming in from the "relay server" to relay back to the original
 * sender.
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
 * Map of TCP/UDP servers bound to the AR.Drone ports.
 */

var servers = {};

/**
 * Create the TCP servers.
 */

Object.keys(PORTS).forEach(function (name) {
  var data = PORTS[name];
  if (data.type != 'tcp') return;

  var port = data.port;
  var server = net.createServer(function (socket) {

    console.log('tcp %d "connect" event', port);

    socket.on('end', function () {
      console.log('tcp %d "end" event', port);
    });

    socket.on('close', function () {
      console.log('tcp %d "close" event', port);
    });

    // connect to the "relay server" TCP relay port
    var relaySocket = net.connect({ host: relayHost, port: relayTcpPort });

    // constuct the "header"
    var header = Buffer(3);
    // this is the "sender"
    header[0] = 0;
    // tell the relay server what port to request from the "receiver"
    header.writeUInt16BE(port, 1);
    relaySocket.write(header);

    // pipe...
    socket.pipe(relaySocket);
    relaySocket.pipe(socket);

  });

  server.on('listening', function () {
    var address = server.address();
    console.log('TCP server listening %s:%s', address.address, address.port);
  });

  // bind to the AR.Drone port
  server.listen(data.local || port);

  servers[port] = server;
});

/**
 * Create the UDP servers.
 */

Object.keys(PORTS).forEach(function (name) {
  var data = PORTS[name];
  if (data.type != 'udp') return;

  var port = data.port;
  var server = dgram.createSocket('udp4');

  server.on('message', function (msg, rinfo) {
    var obj = {
      port: port,
      msg: msg.toString('binary')
    };
    console.log('"message" on port %d from %s:%s (%d bytes)', obj.port, rinfo.address, rinfo.port, msg.length);
    io.emit('udp', obj);

    // save the return info so we know who to send UDP packets back to
    server.lastRinfo = rinfo;
  });

  server.on('listening', function () {
    var address = server.address();
    console.log('UDP server listening %s:%s', address.address, address.port);
  });

  // bind to the AR.Drone port
  server.bind(port);

  servers[port] = server;
});

/**
 * Connect to the "relay server".
 */

var io = sio.connect('http://' + relayHost + ':' + relayPort);

// this is the "sender client"
io.emit('mode', 'sender');

// socket.io events
io.on('connect', function () {
  console.log('"relay server" connected!');
});

io.on('disconnect', function () {
  console.log('socket disconnected!');
});

// UDP-related events
io.on('udp', function (data) {

  // construct a Buffer for the UDP packet
  var msg = new Buffer(data.msg, 'binary');

  // get the UDP server that will send the UDP packet
  var port = data.port;
  var server = servers[port];

  console.log('"udp" for port %d (%d bytes)', port, msg.length);

  // relay the packet back to the UDP port that we last heard from on this port
  var returnAddress = server.lastRinfo.address;
  var returnPort = server.lastRinfo.port;
  console.log('sending back to %j %j', returnAddress, returnPort);
  server.send(msg, 0, msg.length, returnPort, returnAddress);
});
