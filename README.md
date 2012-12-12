ar-drone-socket.io-proxy
========================

This client-server package is part of my DroneOlympics entry, where I attempt
to control an AR.Drone over a Verizon 4G LTE cellular connection.

Instructions
------------

This setup is broken up into 3 parts:

  * An AR.Drone 2.0
  * A "relay server"
  * A "client" which will send commands to control the drone


### Relay Server

The relay server should be a remote server where you have access to UDP ports
`5551` through `5559`. These are the ports that the AR.Drone uses to communicate over.

I chose to set the relay server up on my Mac Mini at my home, and forward the
ports through my Time Capsule using Airport Utility:

![](http://f.cl.ly/items/1p051N1V3I431d1k0u21/Screen%20Shot%202012-12-11%20at%208.46.59%20PM.png)

For the relaying to work, you _also_ must forward TCP port `8080`, which is the
port where the UDP messages received are relayed to the drone over an HTTP
transport.

### Steps to get it going

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
