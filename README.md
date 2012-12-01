ar-drone-socket.io-proxy
========================

This client-server package is part of my DroneOlympics entry, where I attempt
to control an AR.Drone over a Verizon 4G LTE cellular connection.

AT HOME!!!
----------

  1. Be sure to fire up the relay-server before beginning!

Steps to get it going:
----------------------

  1. Power up AR.Drone
  1. Conncet to access point `ardrone2_058438` on laptop
  1. Telnet to `192.168.1.1`. This is the AR.Drone in "host" mode.
  1. Run the `/data/mifi.sh` script; the telnet connection will be killed
  1. On laptop, connect to `natefi` access point (the MiFi)
  1. ping `n8.io` in order to manually resolve the IP address
  1. Telnet to `192.168.1.3`. This is the AR.drone in "client" mode connected to the MiFi.
  1. cd to `/data` and fire up the relay client on the drone:
    RELAY_HOST=1.2.3.4 ./node client.js </dev/null >/dev/null 2>&1 &
  1. `exit` the telnet session. At this point, the Drone is ready to receive commands from `n8.io`.
