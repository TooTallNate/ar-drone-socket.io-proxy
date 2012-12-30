
/**
 * This script connects the AR.Drone to the specified external hotspot, switching
 * it from "managed mode" into "client mode". Once connected to the specified
 * access point, it launches the "receiver.js" program, which should be located at
 * /data/video on the drone alongside the `node` executable.
 */

/**
 * Module dependencies.
 */

var net = require('net');

/**
 * Configurables.
 */

var ip = '192.168.1.1';

var essid = 'natefi';
var passkey = 'nathaniscool1';
var newIp = '192.168.1.3';
var newNetmask = '255.255.255.0';
var newGateway = '192.168.1.1';

var relayHost = '71.202.229.6';

/**
 * Connect to the telnet port.
 */

var prompt = '# ';

var socket = net.connect({ host: ip, port: 23 });
socket.setEncoding('utf8');
socket.on('data', function (b) {
  console.log(0, b);
});
socket.on('data', function waitForPrompt (b) {
  var gotPrompt = Boolean(~b.indexOf(prompt));
  if (gotPrompt) {
    socket.removeListener('data', waitForPrompt);
    //socket.write('ls\r\n');
    sendPayload();
  }
});

socket.on('end', function () {
  console.log('socket "end" event');
});

function sendPayload () {
  console.log('sending payload');
  var payload =
    // connect to ESSID
    'iwconfig ath0 mode managed key s:' + passkey + ' essid ' + essid + '; ' +
    // set static ip and netmask
    'ifconfig ath0 ' + newIp + ' netmask ' + newNetmask + ' up; ' +
    // add route to gateway
    'route add default gw ' + newGateway + '; ' +
    // sleep for a few seconds to make sure we get connected
    'sleep 5; ' +
    // start the "receiver" program in the background, daemonized
    'RELAY_HOST=' + relayHost + ' /data/video/node --expose_gc /data/video/receiver.js </dev/null >/dev/null 2>&1 &\r\n';
    //'\r\n';
    // exit the telnet session and send the command
    //'exit\r\n';
  console.log(payload);
  socket.write(payload);
  socket.end();
}
