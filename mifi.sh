#!/bin/sh

iwconfig ath0 mode managed key s:nathaniscool1 essid natefi;
ifconfig ath0 192.168.1.3 netmask 255.255.255.0 up;
route add default gw 192.168.1.1;
