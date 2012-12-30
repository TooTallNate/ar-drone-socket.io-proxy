ar-drone-socket.io-proxy
========================

This client-server package is part of my [DroneGames][] 2012 entry, where I
attempt to control an AR.Drone over a Verizon 4G LTE cellular connection.

Instructions
------------

This setup is broken up into 3 parts:

  * The "relay server"
  * The AR.Drone 2.0 iteself - the "receiver"
  * The program which sends commands to control the drone - the "sender"

----------------
### Relay Server

The "relay server" is a node.js script that binds to TCP ports `8080` and `8081`.
It awaits for an AR.Drone to connect to the "socket.io" server over the internet,
and relays any "client" UDP activity over the HTTP connection to finally reach
the AR.Drone.

The "relay server" should ideally be a server that has a predictable hostname
(i.e. static IP) because you will be contacting the relay server from both the
AR.Drone and the "client".

#### Forwarding ports

The relay server should be a remote server where you have access to TCP ports
`8080` and `8081`.

I chose to set the relay server up on my Mac Mini at my home, and forward the
ports through my Time Capsule using Airport Utility:

![](http://f.cl.ly/items/0G2x2Z201L2m2c2k292u/Screen%20Shot%202012-12-16%20at%205.39.43%20PM.png)

#### Start the "relay server"

To start the "relay server", simply execute:

``` bash
$ node relay-server.js
```

Leave it running while "droning"...


-----------------------------
### The AR.Drone - "receiver"

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

You can use `ftp` to transfer the `node` executable, the `socket.io-client`
module, the `receiver.js` and `ports.js` files to the AR.Drone. The username is
"anonymous" with no password.

``` bash
$ ftp 192.168.1.1
...
```

#### Connect drone to MiFi

The drone needs to connect to the MiFi as a wifi client and then run the
`receiver.js` program. The `connect.js` script does this for us nicely:

  1. Power up AR.Drone
  1. Connect to access point `ardrone2_058438` on laptop (or whatever _your_ AR.Drone's ESSID is)
  1. Run `node connect.js` on your laptop, it will connect the drone to the MiFi and launch the "receiver" program
  1. At this point, the AR.Drone is ready to receive commands from the "relay server"


-----------------------------
### The controller - "sender"

The "sender" is the computer that is going to be sending commands to the AR.Drone
over the MiFi connection. To begin you need to run the "sender.js" script in order
to bind the AR.Drone ports locally:

``` bash
$ node sender.js
```

Once that is running you can send AR.Drone commands to "localhost". Some
recommended "controllers":

  * [drone-browser](https://github.com/functino/drone-browser)
  * [node-drone-joystick](https://github.com/TooTallNate/node-drone-joystick)
  * [node-drone-video](https://github.com/TooTallNate/node-drone-video)
  * [node-dronestream](https://github.com/bkw/node-dronestream)

You can also telnet directly to the drone over the MiFi connection by connecting
to port `2223`:

``` bash
$ telnet localhost 2223
```

[DroneGames]: http://dronegames.co/
