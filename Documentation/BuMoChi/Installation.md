# Overview

BuMoChi connects several applications. Some are installed separately; others are included in the BuMoChi repository.

| Component | Where it comes from | Required? |
|---|---|---|
| XR-Animator | Download from its official releases page | Required for webcam motion capture; optional for clip-only work |
| Python 3 | Install from Python or your operating-system package manager | Required for the encoder and decoder |
| `BunrakuOSCEncoder` | Included in `PipelineApplications/` | Required for XR-Animator input |
| `OscGroupClient` | Binaries included under `HelperAppsAndExamples/OSCGroups/` | Required only for collaboration over OSCGroups |
| SuperCollider | Download from its official website | Required |
| BuMoChi SuperCollider library | This repository | Required |
| `BunrakuOSCDecoder` | Included in `PipelineApplications/` | Required for sending BuMoChi animation to Godot |
| Godot | Download from its official website | Required for rendering avatars |
| BuMoChi Godot project | Included in the complete ICLC27 workspace, with a reference project also included in BuMoChi | Required for visible avatar output |

The prepared projects have been developed and tested with Godot 4.5. Install Godot 4.5 for reproducible results. Do not upgrade a working performance project to a newer Godot version without first making a copy.

All paths below are relative to the root of the BuMoChi repository unless stated otherwise.

# Obtain BuMoChi

If you do not already have the repository, clone it with:

```bash
git clone https://github.com/iani/BuMoChi.git
cd BuMoChi
```

If you are using the complete ICLC27 workspace, the BuMoChi repository is already located at:

```text
AppsAndCode/BuMoChi/
```

Keep the repository in a permanent location. The optional command-line launchers and the SuperCollider installation described below may use symbolic links pointing back to it.

# XR-Animator

XR-Animator captures body and face motion from a webcam and transmits it as VMC.

1. Open the [official XR-Animator releases page](https://github.com/ButzYung/SystemAnimatorOnline/releases).
2. Download the native desktop build appropriate for your operating system and processor.
3. Read the installation notes included with that release. The macOS build is currently described by its developer as a beta.
4. Extract or install the application in your normal applications folder, outside the BuMoChi repository.
5. Start XR-Animator and grant camera access when macOS or your operating system asks for it.

Use the native desktop application for the BuMoChi pipeline. The browser version is useful for experimentation, but native VMC output is required here.

Do not configure its port yet. The complete startup and port procedure is in [Full Setup Procedure](HelpByTopic/Full%20Setup%20Procedure.md) and [Port Number Setup](HelpByTopic/PortNumberSetup.md).

# Python 3

The two Bunraku pipeline applications require Python 3. They use only the Python standard library; there is no `pip` installation step and no third-party Python package requirement.

Check whether Python is already available:

```bash
python3 --version
```

If the command is unavailable, install Python 3 from [python.org](https://www.python.org/downloads/) or through the package manager used by your operating system. Then open a new terminal and run the version check again.

# BunrakuOSCEncoder

`BunrakuOSCEncoder` is included with BuMoChi. It converts the VMC bundles sent by XR-Animator into complete route-free Bunraku frame messages for SuperCollider and OSCGroups.

Its entry point and support modules are stored together in:

```text
PipelineApplications/
```

No separate installation is required. Confirm that it starts while the terminal is at the BuMoChi repository root:

```bash
python3 PipelineApplications/BunrakuOSCEncoder.py --help
```

Do not copy `BunrakuOSCEncoder.py` by itself because it imports modules beside it. To run it from any terminal directory, create the optional symbolic-link launcher described in [Make BunrakuOSCEncoder available from any terminal directory](HelpByTopic/HelperApplications/BunrakuOSCEncoder.md#make-bunrakuoscencoder-available-from-any-terminal-directory).

For its purpose, options, and startup commands, see [BunrakuOSCEncoder](HelpByTopic/HelperApplications/BunrakuOSCEncoder.md).

# OscGroupClient

`OscGroupClient` is needed only for sharing live motion sources between workstations. A single-user local pipeline can omit it.

BuMoChi includes client binaries for macOS, Linux x86-64, and Windows:

```text
HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient
HelperAppsAndExamples/OSCGroups/bin/linux/arch/OscGroupClient
HelperAppsAndExamples/OSCGroups/bin/windows/OscGroupClient.exe
```

The bundled macOS binary is an Intel `x86_64` executable. On an Apple-silicon Mac, macOS may offer to install Rosetta when the binary is first run.

On macOS or Linux, make the selected binary executable if necessary. For macOS:

```bash
chmod u+x HelperAppsAndExamples/OSCGroups/bin/macos/OscGroupClient
```

The client requires the OSCGroups server address, user credentials, group name, and group password. Obtain these from the person operating the collaboration server.

For installation as a globally accessible command and for the nine required startup arguments, see [OscGroupClient](HelpByTopic/HelperApplications/OSCGroupsClient.md).

The upstream OSCGroups source project is maintained at [Ross Bencina's OSCGroups repository](https://github.com/RossBencina/oscgroups).

# SuperCollider

BuMoChi runs in the SuperCollider language environment.

1. Download the current stable version appropriate for your computer from the [official SuperCollider downloads page](https://supercollider.github.io/downloads).
2. Install and start the SuperCollider IDE.
3. Evaluate the following line in a SuperCollider document to locate the directory in which user class libraries belong:

```supercollider
Platform.userExtensionDir.postln;
```

The returned path is platform- and user-specific. Use that value rather than assuming a fixed path.

BuMoChi's motion processing does not require the SuperCollider audio server to be booted. Boot the audio server only when the performance also synthesizes or processes sound.

# BuMoChi SuperCollider library

SuperCollider must be able to find the BuMoChi repository under `Platform.userExtensionDir`. Use either of these methods:

1. Copy the entire BuMoChi repository folder into the user extensions directory.
2. Preferably, create a symbolic link in the user extensions directory pointing to the permanent BuMoChi repository. This keeps the working Git checkout and the installed class library synchronized.

On macOS, after confirming the path returned by `Platform.userExtensionDir`, a typical symbolic-link installation looks like this:

```bash
mkdir -p "$HOME/Library/Application Support/SuperCollider/Extensions"
ln -s "/absolute/path/to/BuMoChi" "$HOME/Library/Application Support/SuperCollider/Extensions/BuMoChi"
```

Replace `/absolute/path/to/BuMoChi` with the actual repository path. If a `BuMoChi` item already exists at the destination, inspect it before replacing it.

After copying or linking the repository:

1. In SuperCollider choose **Language → Recompile Class Library**.
2. Check the post window for compilation errors.
3. Evaluate:

```supercollider
Bmc.status;
```

A valid status response confirms that the `Bmc` class is installed. After a successful library compilation, Bmc also starts its default OSC dispatcher on UDP port `57130`.

# BunrakuOSCDecoder

`BunrakuOSCDecoder` is included with BuMoChi. It converts routed frames from SuperCollider/Bmc back into standard VMC bundles for Godot.

Confirm that it starts while the terminal is at the BuMoChi repository root:

```bash
python3 PipelineApplications/BunrakuOSCDecoder.py --help
```

As with the encoder, keep the entry point beside its support modules. Do not copy the Python file by itself. To run it from any terminal directory, create the optional symbolic-link launcher described in [Make BunrakuOSCDecoder available from any terminal directory](HelpByTopic/HelperApplications/BunrakuOSCDecoder.md#make-bunrakuoscdecoder-available-from-any-terminal-directory).

For its purpose, options, and startup commands, see [BunrakuOSCDecoder](HelpByTopic/HelperApplications/BunrakuOSCDecoder.md).

# Godot

Godot renders the locally synthesized avatar scene.

1. Download Godot 4.5 from the [official Godot 4.5 archive page](https://godotengine.org/download/archive/4.5-stable/).
2. Choose the standard build for your operating system. The prepared projects use GDScript and do not require the .NET build.
3. Install or extract Godot and start the Project Manager.

The projects currently declare Godot 4.5 compatibility. A newer Godot release may offer to upgrade a project. For performance work, keep the known working 4.5 installation and test upgrades only on a duplicate project.

# Godot projects for BuMoChi

If you have the complete ICLC27 workspace, the prepared Godot projects are stored beside BuMoChi at:

```text
AppsAndCode/GodotProjects/
```

For the default single-avatar Ishidomaru pipeline, use:

```text
AppsAndCode/GodotProjects/Seed_2_Ishidomaru_C/project.godot
```

For the uniform two-avatar Mother and Ishidomaru arrangement, use:

```text
AppsAndCode/GodotProjects/Seed_4_Mother_Ishidomaru_E/project.godot
```

Import a project into Godot:

1. Open the Godot Project Manager.
2. Click **Import**.
3. Browse to the project's `project.godot` file.
4. Confirm the project path and import it.
5. Allow Godot to complete its first import before running the scene.

Each prepared avatar project already contains its required Godot VMC Tracker, VRM importer, and MToon shader add-ons under its own `addons/` directory. Do not install duplicate copies from the Asset Library into that project.

A standalone BuMoChi checkout also includes the body-tracking reference project:

```text
PipelineApplications/GodotVMCReference/project.godot
```

That reference project contains Godot VMC Tracker and is intended for pipeline diagnosis. The prepared projects in the complete ICLC27 workspace contain the configured avatars used by the performance examples.

For avatar receiver ports and tracker names, see [Port Number Setup](HelpByTopic/PortNumberSetup.md) and [Multi-Avatar project port number setting in Godot](HelpByTopic/Multi-Avatar%20project%20port%20number%20setting%20in%20godot%20-%20NOTES.md).

# Verify the installation

Before attempting the complete live pipeline, verify these commands independently:

```bash
python3 --version
python3 PipelineApplications/BunrakuOSCEncoder.py --help
python3 PipelineApplications/BunrakuOSCDecoder.py --help
```

In SuperCollider, verify:

```supercollider
Bmc.status;
```

In Godot, confirm that the selected project opens without missing-addon or script errors.

Installation is then complete. Continue with [Getting Started](Getting%20Started.md) for a small sequence of user tests, or use [Full Setup Procedure](HelpByTopic/Full%20Setup%20Procedure.md) to start and connect the complete XR-Animator–BuMoChi–Godot pipeline.
