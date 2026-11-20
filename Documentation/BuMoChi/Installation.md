# Overview

BuMoChi connects several applications. SuperCollider, Python and Godot are installed separately; the OS-specific BuMoChi release ZIP includes XR-Animator and the pipeline helpers. Starter assets are a separate download.

| Component | Where it comes from | Required? |
|---|---|---|
| XR-Animator | Included in the OS-specific BuMoChi release ZIP | Required for webcam motion capture; optional for clip-only work |
| Python 3 | Install from Python or your operating-system package manager | Required for the encoder and decoder |
| `BunrakuOSCEncoder` | Included in `PipelineApplications/` | Required for XR-Animator input |
| `OscGroupClient` | Binaries included under `HelperAppsAndExamples/OSCGroups/` | Required only for collaboration over OSCGroups |
| SuperCollider | Download from its official website | Required |
| BuMoChi SuperCollider library | OS-specific BuMoChi release ZIP | Required |
| `BunrakuOSCDecoder` | Included in `PipelineApplications/` | Required for sending BuMoChi animation to Godot |
| Godot | Download from its official website | Required for rendering avatars |
| BuMoChi Godot project | Download BuMoChi_Assets separately; a diagnostic reference project is included in BuMoChi | Required for visible avatar output |

The prepared projects have been developed and tested with Godot 4.5. Install Godot 4.5 for reproducible results. Do not upgrade a working performance project to a newer Godot version without first making a copy.

All paths below are relative to the root of the extracted BuMoChi folder unless stated otherwise.

# Obtain BuMoChi

Open [BuMoChi Releases](https://github.com/iani/BuMoChi/releases) and choose the ZIP for your operating system and processor from the release's **Assets** list:

| Computer | Package suffix |
|---|---|
| Apple silicon Mac | `macos-arm64.zip` |
| Windows 64-bit Intel/AMD | `windows-x64.zip` |
| Linux 64-bit Intel/AMD | `linux-x64.zip` |

Extract the archive and keep the complete `BuMoChi` folder in a permanent location. These packages include the matching native **XR-Animator 0.34.3** application under `XRAnimator/`; no separate XR-Animator download is needed. Keep that folder in place so **Open XR-Animator** can find it.

Choose the OS-specific release asset, not **Source code (zip)** or **Code → Download ZIP**. Source archives and Git clones do not include XR-Animator binaries. Cloning remains an option for development, but requires supplying XR-Animator separately. Intel Macs and ARM Windows/Linux are not covered by these three packages.

The workshop packages are prereleases. Consult the release notes for platform validation; Windows/Linux camera, audio and complete workshop operation still require native testing.

# XR-Animator

XR-Animator captures body and face motion from a webcam and transmits it as VMC. The native application is included in your OS-specific release ZIP; do not download it again.

After installing the SuperCollider library below, evaluate `Bmc.assetEditor;` and click **Open XR-Animator**. Select your camera and grant camera access when asked. Keep the bundled `XRAnimator/` directory inside BuMoChi: its application path is resolved relative to the library.

On Linux, if extraction loses execute permissions, restore them on `XRAnimator/Bin/Linux/XR-Animator_electron-v35.1.2-linux-x64_SA/electron`. Install the graphical runtime dependencies required by Electron for your distribution. Read the upstream notices retained in the bundle.

Use the native desktop application; the browser version does not supply the native VMC output required here. For source-only developer installations, obtain a compatible native build from the [upstream releases](https://github.com/ButzYung/SystemAnimatorOnline/releases).

The normal encoder destination is `127.0.0.1:39537`. See [XR-Animator](HelpByTopic/MainApplications/XR-Animator.md), [Setup](HelpByTopic/Setup.md), and [Port Number Setup](HelpByTopic/PortNumberSetup.md).

# Python 3

The two Bunraku pipeline applications require Python 3.10 or later. They use only the Python standard library; there is no `pip` installation step and no third-party Python package requirement.

Check whether Python is already available (on Windows use `python` instead of `python3` throughout this guide and enable **Add Python to PATH** during installation):

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

SuperCollider must be able to find the complete BuMoChi folder under `Platform.userExtensionDir`. Use either of these methods:

1. Move or copy the entire extracted BuMoChi folder into the user extensions directory.
2. Alternatively, create a symbolic link in the user extensions directory pointing to the permanent BuMoChi folder. This lets SuperCollider use the library in that location.

On macOS, after confirming the path returned by `Platform.userExtensionDir`, a typical symbolic-link installation looks like this:

```bash
mkdir -p "$HOME/Library/Application Support/SuperCollider/Extensions"
ln -s "/absolute/path/to/BuMoChi" "$HOME/Library/Application Support/SuperCollider/Extensions/BuMoChi"
```

Replace `/absolute/path/to/BuMoChi` with the actual extracted folder path. If a `BuMoChi` item already exists at the destination, inspect it before replacing it.

Install only one copy of the library. After copying or linking the folder:

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

Download [BuMoChi_Assets](https://github.com/iani/BuMoChi_Assets) using **Code → Download ZIP** and extract it. This separate starter asset download is required for the workshop scenes and example clips.

In SuperCollider evaluate:

```supercollider
Platform.userAppSupportDir.postln;
```

Rename `BuMoChi_Assets-main` to `BuMoChiAssets` and place it directly inside the printed directory. `GodotProjects` and `AnimationClips` must be directly inside `BuMoChiAssets`, without an extra enclosing folder. Preserve any existing assets; merge carefully or use **Select Asset Folder** in the Asset Editor to choose another assets root.

Use `BuMoChiAssets/GodotProjects/VMC_1_Avatar_M/project.godot` for Ishidomaru, `VMC_1_Avatar_F` for Mother, or `VMC_2_Avatars` for both. Import the selected `project.godot` in Godot and allow its resources to finish importing. Keep each complete project folder, including its supplied add-ons.

Open `Bmc.assetEditor;` and click **Reload** after installing assets. See [BuMoChi Assets](HelpByTopic/BuMoChi%20Assets.md) for folder selection and [Setup](HelpByTopic/Setup.md) for discovery and startup.

BuMoChi also includes `PipelineApplications/GodotVMCReference/project.godot` for pipeline diagnosis.

## Configure the Godot executable

The default is `/Applications/Godot.app/Contents/MacOS/Godot` on macOS and `godot` on PATH elsewhere. If needed, set the executable path, not its containing folder:

```supercollider
// Example for Windows: replace with your actual executable path.
Bmc.godotExecutable_("C:/Tools/Godot/Godot_v4.5-stable_win64.exe");
```

The setting persists after recompilation. On Linux install `lsof` for the Godot process/port checks.

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

Installation is then complete. Continue with [Getting Started](Getting%20Started.md) for a small sequence of user tests, or use [Setup](HelpByTopic/Setup.md) to start and connect the complete XR-Animator–BuMoChi–Godot pipeline.

## Verify the windows

Evaluate `Bmc.assetEditor;`, click **Start BMC Pipeline**, select a project and scene, then click **Open Scene**. Select an avatar and clip to test **Play**. Click **Open XR-Animator** to test the bundled application. Windows uses the Python local-only pipeline launcher; macOS/Linux use the Bash launcher.

Evaluate `Bmc.sceneCompositor;` to open the [SceneCompositor window](HelpByTopic/SceneCompositor.md). Select source clips and a scene, generate a performance, preview it, and save it as a new clip. Clip-only composition does not require a webcam or XR-Animator to be running.
