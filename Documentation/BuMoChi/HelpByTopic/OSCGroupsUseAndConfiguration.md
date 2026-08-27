---
title: OscGroupClient Use and Configuration
---

`OscGroupClient` is an application that acts as a bridge between a local performance workstation and remote performance workstations. It sends OSC messages to `OscGroupServer`, which relays those messages to the other clients registered in the same authenticated group.

`OscGroupClient` is a compiled executable, not a Python script. One client normally handles both directions on a workstation: local applications send to its local transmission port, and it forwards messages received from remote group members to its local reception port.

# Receiving animation data from a remote workstation via OSCGroups

To receive remote Bunraku frames in Bmc, set the client's `localrxport` to the port on which Bmc listens. The recommended local Bmc input is `57130`:

``` supercollider
Bmc.start(57130);
```

The client forwards messages received from other group members to `127.0.0.1:57130`. It does not decode or modify the Bunraku frames.

# Sending animation data to remote workstations via OSCGroups

To send frames to remote group members, direct the local producing application to the client's `localtxport`. The recommended local transmission port is `22244`.

The current `BunrakuOSCEncoder` does this automatically. By default, it sends each frame both to `OscGroupClient` on `22244` and directly to local Bmc on `57130`. The direct copy is necessary because OSCGroups sends the network copy to the other group members and does not echo it to the originating client.

For example, send the output of `BunrakuOSCEncoder` to:

``` example
127.0.0.1:22244
```

The client receives those local packets and relays them through the OSCGroups server to the other members of the group.

# OscGroupClient arguments

The client requires nine positional arguments in this exact order:

``` example
OscGroupClient serverAddress serverPort localToRemotePort localTxPort localRxPort userName userPassword groupName groupPassword
```

- `serverAddress`: IP address or DNS name of the OSCGroups server.
- `serverPort`: server registration port; commonly `22242`.
- `localToRemotePort`: local network port used to communicate with the server and peers. It must be free and may need to differ between clients behind the same NAT.
- `localTxPort`: local input to OSCGroups. Send local OSC here to transmit it to the group; recommended `22244`.
- `localRxPort`: local output from OSCGroups. Remote group traffic is forwarded here; recommended `57130` for Bmc.
- `userName` and `userPassword`: credentials unique to this client.
- `groupName` and `groupPassword`: credentials shared by all members of the performance group.

Do not commit real user or group passwords to the repository. All local port numbers supplied to one client must be distinct and must not already be owned by another process.

# Launch OscGroupClient

## Launch from the ICLC27 project directory on macOS

Open Terminal and change to the top-level `260715_ICLC27` directory. Replace every uppercase placeholder with the current rehearsal credentials:

``` bash
AppsAndCode/OSCGroups/bin/macos/OscGroupClient \
  SERVER_ADDRESS \
  22242 \
  LOCAL_TO_REMOTE_PORT \
  22244 \
  57130 \
  USER_NAME \
  USER_PASSWORD \
  GROUP_NAME \
  GROUP_PASSWORD
```

This one process both receives and sends:

``` example
local application -> 127.0.0.1:22244 -> OSCGroups network
OSCGroups network -> client -> 127.0.0.1:57130 -> Bmc
```

## Launch from the OSCGroups directory

``` bash
cd /Users/iani/Obsidian/Iani/Projects/260715_ICLC27/AppsAndCode/OSCGroups

./bin/macos/OscGroupClient \
  SERVER_ADDRESS 22242 LOCAL_TO_REMOTE_PORT 22244 57130 \
  USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

## Launch from anywhere after installing the executable

If `OscGroupClient` has been copied or linked into a directory on your shell `PATH`:

``` bash
OscGroupClient \
  SERVER_ADDRESS 22242 LOCAL_TO_REMOTE_PORT 22244 57130 \
  USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

The client should report successful registration with the server and group. Keep its Terminal window open during the session. Press `Control-C` to stop it.

# Verify the local ports

On macOS, check that the client owns its local transmission port and that Bmc owns its receiving port:

``` bash
lsof -nP -iUDP:22244
lsof -nP -iUDP:57130
```

If either launch reports `Address already in use`, stop the older listener or choose another free port and update both ends of that connection.
