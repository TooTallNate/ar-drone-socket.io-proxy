
/**
 * This is the "relay-server". It binds a "socket.io" server to port 8080.
 * The "sender" and "receiver" clients both connect to this "socket.io" relay
 * server and communicate UDP messges over it. It also binds a regular "net"
 * server to port 8081 which is used to 
 */

/**
 * Module dependencies.
 */

var net = require('net');
var sio = require('socket.io');
var assert = require('assert');

/**
 * Socket.io TCP port to bind to. Port 8080 by default.
 */

var port = parseInt(process.argv[2], 10) || 8080;

/**
 * "net" server TCP port to bind to. Port 8081 by default.
 */

var netPort = 8081;

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

var io = sio.listen(port, function () {
  var address = this.address();
  console.log('socket.io "relay server" listening: %s:%s', address.address, address.port);
});

/**
 * We wait for the socket.io client connection before we can relay any UDP
 * traffic. Simply expose the "socket" variable to the global scope.
 */

io.sockets.on('connection', function (socket) {
  console.log('socket connected...');

  socket.on('disconnect', function () {
    console.log('"disconnect" event from %j', socket.relayMode);
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
        if (sender) {
          // some old sender socket? try to disconnect...
          sender.disconnect();
        }
        sender = socket;
        break;
      case 'receiver':
        // the AR.Drone itself
        if (receiver) {
          // some old receiver socket? try to disconnect...
          receiver.disconnect();
        }
        receiver = socket;
        break;
      default:
        // shouldn't happen...
        socket.disconnect();
        break;
    }
  });

  function proxyEvent (event) {
    socket.on(event, function (data) {
      console.log('"%s" event from %j (%d args)', event, socket.relayMode);
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
        // drop data on floor...
        console.log('dropping data on floor - target not connected');
        return;
      }
      target.emit(event, data);
    });
  }

  [ 'udp'
    //'tcp connect'
  ].forEach(proxyEvent);
});


/**
 * The "net" server waits for TCP connections and parses the first 3 bytes:
 *
 *   0: unsigned 8-bit integer: 0=sender, 1=receiver
 *   1-2: unsigned 16-bit integer: sender=port to request, receiver=port responding with
 */

var senderSockets = {};

var netServer = net.createServer(function (socket) {
  console.log('"connect"', socket);

  // parse the first 3 bytes of the connection
  socket.once('data', parseHeader);

  function parseHeader (data) {
    assert(data.length >= 3); // if the first buffer isn't >= 3 bytes then we're fucked
    var leftover;
    // need to parse the next two bytes to determine the "port" of the request
    var port = data.readUInt16BE(1);
    switch (data[0]) {
      case 0: // sender (program)
        if (data.length > 3) {
          // got some extra data already... need to buffer it until the "receiver
          // socket" is connected.
          leftover = data.slice(3);
          buffer(leftover);
        }
        receiver.emit('tcp connect', { port: port });
        socket.pause();
        socket.on('data', buffer);
        socket.removeBuffer = function () {
          socket.resume();
          return socket.removeListener('data', buffer);
        };
        if (!senderSockets[port]) senderSockets[port] = [];
        senderSockets[port].push(socket);
        break;
      case 1: // receiver (AR.Drone)
        // get the next "sender socket" and begin piping data both ways
        if (!senderSockets[port]) {
          // unexpected "receiver socket"... abort
          socket.destroy();
          return;
        }
        var sender = senderSockets[port].shift();
        if (!sender) {
          // unexpected "receiver socket"... abort
          socket.destroy();
          return;
        }
        if (data.length > 3) {
          // got some extra data already... write it immediately to the "sender
          // socket"
          leftover = data.slice(3);
          sender.write(leftover);
        }
        if (sender.relayLeftover) {
          sender.relayLeftover.forEach(function (b) {
            socket.write(b);
          });
          sender.relayLeftover = null; // for the gc
        }
        // remove the "buffer" data listener from before
        sender.removeBuffer();
        // just start piping!!! let the node gods take us from here...
        socket.pipe(sender);
        sender.pipe(socket);
        break;
      default: // shouldn't happen... abort
        socket.destroy();
        break;
    }
  }

  function buffer (data) {
    if (!socket.relayLeftover) socket.relayLeftover = [];
    socket.relayLeftover.push(data);
  }
});

netServer.listen(netPort, function () {
  var address = this.address();
  console.log('TCP net "relay server" listening:   %s:%s', address.address, address.port);
});
