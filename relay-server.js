
/**
 * Module dependencies.
 */

var http = require('http');
var dgram = require('dgram');
var sio = require('socket.io');

/**
 * Constants.
 */

var NAVDATA_PORT = 5554;
var VIDEO_PORT   = 5555;
var AT_PORT      = 5556;

var udpServers = {};

/**
 * The connection socket.io client connection.
 */

var socket;

/**
 * Array of buffered UDP messages for when there's no "socket" connected.
 */

var buffer = [];

/**
 * Setup UDP servers.
 */

;[ NAVDATA_PORT, VIDEO_PORT, AT_PORT ].forEach(function (port) {

  var server = dgram.createSocket('udp4');

  server.on("message", function (msg, rinfo) {
    console.log('"message"', msg, rinfo);
    //console.log(0, msg.toString('binary'));
    var obj = {
      port: port,
      msg: msg.toString('binary')
      //rinfo: rinfo
    };
    if (socket) {
      sendMessage(obj);
    } else {
      buffer.push(obj);
    }
  });

  server.on("listening", function () {
    var address = server.address();
    console.log("UDP server listening " +
        address.address + ":" + address.port);
  });

  server.bind(port);

  udpServers[port] = server;
});

/**
 * Setup socket.io server.
 */

var io = sio.listen(8080);

/**
 * We wait for the socket.io client connection before we can relay any UDP
 * traffic. Simply expose the "socket" variable to the global scope.
 */

io.sockets.on('connection', function (_socket) {
  if (socket) {
    // already a connected socket
    _socket.disconnect();
    return;
  } else {
    socket = _socket;
  }

  console.log('"connection"', socket);

  socket.on('udp', function (obj) {
    var msg = new Buffer(data.msg, 'binary');
    var port = data.port;
    var socket = udpServers[port];
    socket.send(msg, 0, msg.length, port, '127.0.0.1');
  });

  socket.on('disconnect', function () {
    console.log('socket disconnected...');
    socket = null;
    //clearInterval(i);
  });

  if (buffer.length > 0) {
    console.log('flushing %d "message" events', buffer.length);
    buffer.forEach(sendMessage);
  }

  /*
  var i = setInterval(function () {
    socket.emit('udp', { hello: new Date() });
  }, 1000);
  */
});

function sendMessage (obj) {
  //console.error(obj);
  socket.emit('udp', obj);
}
