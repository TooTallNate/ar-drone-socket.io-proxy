
/**
 * These are the TCP/UDP ports used by the AR.Drone as
 * specified by felix's node-ar-drone module.
 */

module.exports = {
  TELNET:         { port: 23, type: 'tcp', local: 2223 },
  FTP:            { port: 5551, type: 'tcp' },
  AUTH:           { port: 5552, type: '???' },
  VIDEO_RECORDER: { port: 5553, type: 'tcp' },
  NAVDATA:        { port: 5554, type: 'udp' },
  VIDEO:          { port: 5555, type: 'tcp' },
  AT:             { port: 5556, type: 'udp' },
  RAW_CAPTURE:    { port: 5557, type: 'tcp' },
  PRINTF:         { port: 5558, type: '???' },
  CONTROL:        { port: 5559, type: 'tcp' }
};
