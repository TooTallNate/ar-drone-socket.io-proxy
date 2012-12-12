ar-drone-socket.io-proxy
========================

This client-server package is part of my DroneOlympics entry, where I attempt
to control an AR.Drone over a Verizon 4G LTE cellular connection.

Instructions
------------

This setup is broken up into 3 parts:

  * The "relay server"
  * The AR.Drone 2.0 iteself
  * The "client" which will send commands to control the drone


### Relay Server

The "relay server" is a node.js script that binds to TCP port `8080` and UDP ports
`5551` through `5559`. It awaits for an AR.Drone to connect to the TCP port over
the internet, and relays any "client" UDP activity over the HTTP connection to
finally reach the AR.Drone.

The "relay server" should ideally be a server that has a predictable hostname
(i.e. static IP) because you will be contacting the relay server from both the
AR.Drone and the "client".

_Note:_ UDP packets sent back _from_ the drone _to_ the relay server currently
get lost there, and never make it back to the originating "client". This will
hopefully be fixed soon (but will most likely involve a "relay client" running on
the client's machine).

#### Forwarding ports

The relay server should be a remote server where you have access to UDP ports
`5551` through `5559`. These are the ports that the AR.Drone uses to communicate over.

I chose to set the relay server up on my Mac Mini at my home, and forward the
ports through my Time Capsule using Airport Utility:

![](http://f.cl.ly/items/0u1q3s411702422o3116/Screen%20Shot%202012-12-11%20at%208.33.25%20PM.png)

For the relaying to work, you _also_ must forward TCP port `8080`, which is the
port where the UDP messages received are relayed to the drone over an HTTP
transport.

#### Start the "relay server"

To start the "relay server", simply execute:

``` bash
$ node relay-server.js
```

Leave it running while "droning"...


### The AR.Drone

I used velcro to strap the MiFi to the top of the indoor hull of the AR.Drone.

![](http://f.cl.ly/items/440o273z0D2k2j3J3N1V/drone-mifi.png)

On the drone itself I have running a "receiver client" which establishes a
connection to the remote "relay server" over the MiFi's cellular connection.

#### The MiFi

I set the MiFi up to use WEP encryption (rather than the default WPA2 encryption),
and renamed the ESSID to something that didn't contain any spaces (`natefi` in
this case).

Be sure the MiFi is on and broadcasting before going to the next step...

#### Prepare Drone to run the receiver client

__TODO:__ add instructions for transfering `node` executable and socket.io to
AR.Drone's `/data` dir...

#### Connect drone to MiFi

The drone itself is somewhat tedious to set up. This process can be improved..

  1. Power up AR.Drone
  1. Conncet to access point `ardrone2_058438` on laptop (or whatever _your_ AR.Drone's ESSID is)
  1. Telnet to `192.168.1.1`. Your are connected to the AR.Drone in "host" mode.
  1. Copy and paste the `mifi.sh` script; the telnet connection will be killed
  1. On laptop, connect to your MiFi access point (`natefi` in my case)
  1. `ping` your "relay server" hostname (`n8.io` in my case) in order to manually resolve the IP address (required because I haven't figured out how to get DNS working on the drone yet)
  1. Telnet to `192.168.1.3`. This is the AR.drone in "client" mode connected to the MiFi.
  1. cd to `/data` and fire up the relay client on the drone: `RELAY_HOST=1.2.3.4 ./node client.js </dev/null >/dev/null 2>&1 &` (replace `1.2.3.4` with the resolved IP of your "relay server")
  1. `exit` the telnet session. At this point, the Drone is ready to receive commands from the "relay server".
