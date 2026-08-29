# What is OscGroupClient?

`OscGroupClient` is the workstation-side application for OSCGroups, an open-source system for exchanging OSC messages between collaborators over a network. One full-duplex client is sufficient on each workstation: it sends local OSC data to an `OscGroupServer` and delivers the other group members' OSC data to a local application.

In BuMoChi, the local encoder sends route-free motion-source frames to the client's input port `22244`. The client shares those frames with the group. Frames received from remote performers leave the client through output port `57130` and enter the local SuperCollider/Bmc process. Completed figures, routed avatar frames, decoder output, and Godot VMC output must not be sent through OSCGroups.

```text
local BunrakuOSCEncoder → UDP 22244 → OscGroupClient → OSCGroups network
remote OSCGroups data   → OscGroupClient → UDP 57130 → local Bmc
```

# Where to find OscGroupClient

All repository paths in this guide are relative to the root of the BuMoChi repository. Run the shown repository commands after changing into that root folder.

BuMoChi includes precompiled `OscGroupClient` applications for macOS and Windows:

```text
HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient
HelperAppsAndExamples/OSCGroups/bin/windows/OscGroupClient.exe
```

The complete ICLC27 repository also currently contains Linux, macOS, and Windows binaries under:

```text
../OSCGroups/bin/linux/arch/OscGroupClient
../OSCGroups/bin/macos/OscGroupClient
../OSCGroups/bin/windows/OscGroupClient.exe
```

The supplied macOS binary is an Intel `x86_64` application. On an Apple-silicon Mac, macOS may ask to install Rosetta the first time it is opened.

# Command-line arguments

`OscGroupClient` expects nine arguments in this exact order:

```text
OscGroupClient SERVER_ADDRESS SERVER_PORT LOCAL_TO_REMOTE_PORT INPUT_PORT OUTPUT_PORT USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

| Argument | BuMoChi meaning |
|---|---|
| `SERVER_ADDRESS` | Hostname or IP address of the shared `OscGroupServer` |
| `SERVER_PORT` | Server port; normally `22242` |
| `LOCAL_TO_REMOTE_PORT` | A free local network-facing port used by this client |
| `INPUT_PORT` | Receives local encoder frames for network transmission; normally `22244` |
| `OUTPUT_PORT` | Sends received remote frames to local Bmc; normally `57130` |
| `USER_NAME` | Unique username for this workstation |
| `USER_PASSWORD` | Password for that user |
| `GROUP_NAME` | Shared collaboration-group name |
| `GROUP_PASSWORD` | Password for the shared group |

Use a different username and a different `LOCAL_TO_REMOTE_PORT` on each workstation. All collaborators use the same server address, server port, group name, and group password.

# How to start OscGroupClient

From the BuMoChi repository root on macOS:

```bash
HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient \
  SERVER_ADDRESS 22242 LOCAL_TO_REMOTE_PORT 22244 57130 \
  USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

Replace every uppercase placeholder. For example:

```bash
HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient \
  oscgroups.example.org 22242 22243 22244 57130 \
  PerformerA USER_PASSWORD ICLC27 GROUP_PASSWORD
```

Leave this terminal open while collaborating. Stop the client with `Control-C`.

# Make OscGroupClient available from any terminal directory

For a user-only installation on macOS or Linux, `~/.local/bin` is a convenient location. It does not require administrator access.

Create the directory if necessary:

```bash
mkdir -p "$HOME/.local/bin"
```

On macOS, copy the bundled binary and ensure that it is executable:

```bash
cp "HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient" "$HOME/.local/bin/OscGroupClient"
chmod u+x "$HOME/.local/bin/OscGroupClient"
```

On Linux, use the corresponding Linux binary instead:

```bash
cp "../OSCGroups/bin/linux/arch/OscGroupClient" "$HOME/.local/bin/OscGroupClient"
chmod u+x "$HOME/.local/bin/OscGroupClient"
```

Ensure that `~/.local/bin` is in the shell search path. For the default macOS `zsh` shell, add this line to `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

For Bash, add the same line to `~/.bashrc`. Open a new terminal afterward, or reload the relevant file:

```bash
source "$HOME/.zshrc"
```

Confirm that the command is visible:

```bash
which OscGroupClient
```

You can then start it from any directory:

```bash
OscGroupClient \
  SERVER_ADDRESS 22242 LOCAL_TO_REMOTE_PORT 22244 57130 \
  USER_NAME USER_PASSWORD GROUP_NAME GROUP_PASSWORD
```

System-wide alternatives are `/usr/local/bin` on macOS and most Linux systems, or `/opt/homebrew/bin` on Apple-silicon systems using Homebrew. Installing there may require administrator permission. The user-only `~/.local/bin` method is simpler and safer.

# Port and process checks

Before starting the complete pipeline, check the important local ports:

```bash
lsof -nP -iUDP:22244
lsof -nP -iUDP:57130
```

After startup, `OscGroupClient` should own input port `22244`; Bmc should own `57130`. Do not configure the client output as `22244`, because received frames would be transmitted again and create a loop. Do not configure it as decoder port `39538`, because remote source frames must enter Bmc before local figure synthesis.

# Security note

The username and passwords are command-line arguments and may be visible temporarily to other local processes or in shell history. Use collaboration-specific credentials rather than passwords reused for important accounts.

# Cheat-sheet

```bash
OscGroupClient ip.kept.secret.here 22242 22546 22244 57130 username 12345 groupname grouppassword
```
