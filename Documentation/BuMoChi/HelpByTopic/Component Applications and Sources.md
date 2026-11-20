# Overview

This file contains background information about the component applications of this system and their use. For procedural installation instructions, see [Installation](../Installation.md).

BuMoChi is available as source code and as [OS-specific release ZIPs](https://github.com/iani/BuMoChi/releases). The release ZIPs include the matching native XR-Animator application; source clones and GitHub source archives do not. Use the release asset matching your OS and CPU for workshop installation. See [Installation](../Installation.md) for supported package suffixes and setup.

# What this repository includes

- The BuMoChi SuperCollider classes, examples, and documentation.
- The Bunraku OSC/VMC encoder and decoder.
- OSCGroupsClient and OSCGroupsServer binaries.
- Protocol tests and diagnostic senders.
- A canonical Godot VMC test project.

# Applications and installation sources

## 1. SuperCollider

Download SuperCollider from its official website:

<https://supercollider.github.io/downloads>

Extract the OS-specific release ZIP and move or copy its complete BuMoChi folder into the SuperCollider user extensions directory, or put a symbolic link to that folder there. To display the user support directory, evaluate this in SuperCollider:

``` supercollider
Platform.userExtensionDir.postln;
```

After installing or linking BuMoChi, recompile the class library from the SuperCollider IDE.

## 2. Python 3

The scripts in `PipelineApplications/` use the Python standard library and do not require a package installation. Check the interpreter with:

``` sh
python3 --version
```

## 3. Godot 4.5 standard

Download Godot from its official website:

<https://godotengine.org/download/archive/4.5-stable/>

Import `PipelineApplications/GodotVMCReference/project.godot` into Godot. This project is the reference renderer for the pipeline tests and listens for standard VMC on UDP port `39539`.

## 4. XR Animator

The native XR-Animator 0.34.3 application is included in each OS-specific BuMoChi release ZIP. No separate download is required. Keep `XRAnimator/` inside BuMoChi and launch it with **Open XR-Animator** in `Bmc.assetEditor;`. Allow camera access and select a camera.

Use the native Electron application for VMC output. The browser-only version does not provide that output. Source-only developers can obtain an application from the [official upstream releases](https://github.com/ButzYung/SystemAnimatorOnline/releases).

The bundled application preserves upstream documentation, credits, licence information and third-party notices. See [XR-Animator setup](MainApplications/XR-Animator.md) and the [upstream project](https://github.com/ButzYung/SystemAnimatorOnline).

For the direct reference test, configure XR Animator's VMC destination as:

``` text
127.0.0.1:39539
```

For the Bunraku encoder tests, configure its VMC destination as:

``` text
127.0.0.1:39537
```

## 5. OSCGroups — required only for networked tests

OSCGroups is an external network transport maintained by Ross Bencina:

<https://github.com/RossBencina/oscgroups>

It is not required for the local XR Animator → Godot reference test or the local Python/SuperCollider diagnostic tests. Install the OSCGroups client only when testing the distributed pipeline.

# Recommended first verification

Open a terminal at the BuMoChi repository root and follow [Bunraku pipeline tests](Bunraku%20pipeline%20tests.md) in order:

1.  XR Animator → Godot.
2.  XR Animator → Bunraku encoder → OSCGroups → decoder → Godot.
3.  SuperCollider → decoder → Godot.
4.  Complete XR Animator → OSCGroups → SuperCollider → decoder → Godot chain.

Do not continue to the next test until the preceding test passes. This keeps installation problems separate from network, encoding, SuperCollider, and rendering problems.

# Distribution policy

OS-specific release ZIPs bundle XR-Animator with its upstream directory layout and notices. Application bundles remain outside the source checkout. SuperCollider, Python 3.10+, Godot 4.5 standard and [BuMoChi_Assets](https://github.com/iani/BuMoChi_Assets) are separate downloads.

Consult each release's notes for the bundled version and platform validation. These workshop packages are prereleases; Windows/Linux full camera, audio and rendering behaviour still needs native testing.
