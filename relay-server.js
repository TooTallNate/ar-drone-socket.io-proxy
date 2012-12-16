
/**
 * Module dependencies.
 */

var sio = require('socket.io');

/**
 * Socket.io TCP port to bind to. Port 8080 by default.
 */

var port = parseInt(process.argv[2], 10) || 8080;

/**
 * The connection to the socket.io "receiver client".
 */

var receiver;

/**
 * The connection to the socket.io "sender client".
 */

var sender;

/**
 * Setup socket.io server.
 */

console.log('socket.io "relay server" starting on port %d', port);
var io = sio.listen(port);

/**
 * We wait for the socket.io client connection before we can relay any UDP
 * traffic. Simply expose the "socket" variable to the global scope.
 */

io.sockets.on('connection', function (socket) {
  console.log('socket connected...');

  socket.on('disconnect', function () {
    console.log('"disconnect" event');
    if (socket === receiver) {
      receiver = null;
    } else if (socket === sender) {
      sender = null;
    }
  });

  socket.on('mode', function (mode) {
    console.log('%j connected!', mode);
    socket.relayMode = mode;
    switch (mode) {
      case 'sender':
        // the program sending commands to the AR.Drone
        sender = socket;
        break;
      case 'receiver':
        // the AR.Drone itself
        receiver = socket;
        break;
      default:
        // shouldn't happen...
        socket.disconnect();
        break;
    }
  });

  socket.on('udp', function (obj) {
    console.log('"udp" event from %j:', socket.relayMode, obj);
    var target;
    if (socket === sender) {
      target = receiver;
    } else if (socket === receiver) {
      target = sender;
    } else {
      // shouldn't happen...
      socket.disconnect();
      return;
    }
    if (!target) {
      // "receiver" or "sender" must not be connected yet...
      // drop packet on floor...
      console.log('dropping packet on floor - target not connected');
      return;
    }
    target.emit('udp', obj);
  });
});
