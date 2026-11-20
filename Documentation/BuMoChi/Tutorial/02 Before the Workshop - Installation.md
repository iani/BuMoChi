# 02 Before the Workshop: Installation

Please complete this chapter **before** you arrive. Downloads are large and the workshop network may be slow. The full reference is [Installation](../Installation.md); this is the short version.

## 1. Install the separate prerequisites

- [SuperCollider](https://supercollider.github.io/downloads/).
- [Godot 4.5 standard](https://godotengine.org/download/archive/4.5-stable/) (the .NET build is not needed).
- [Python 3.10 or later](https://www.python.org/downloads/). No extra Python packages are needed. On Windows enable **Add Python to PATH**.

## 2. Download the BuMoChi release

Open [BuMoChi Releases](https://github.com/iani/BuMoChi/releases) and choose the ZIP for your operating system and processor from the release's **Assets** list:

| Computer | Package suffix |
|---|---|
| Apple silicon Mac | `macos-arm64.zip` |
| Windows 64-bit Intel/AMD | `windows-x64.zip` |
| Linux 64-bit Intel/AMD | `linux-x64.zip` |

Extract the archive and keep the complete `BuMoChi` folder in a permanent location. These packages include the matching native **XR-Animator 0.34.3** application under `XRAnimator/`; no separate XR-Animator download is needed. Keep that folder in place so **Open XR-Animator** can find it.

Choose the OS-specific release asset, not **Source code (zip)** or **Code → Download ZIP**. Source archives and Git clones do not include XR-Animator binaries. Cloning remains an option for development, but requires supplying XR-Animator separately. Intel Macs and ARM Windows/Linux are not covered by these three packages.

The workshop packages are prereleases. Consult the release notes for platform validation; Windows/Linux camera, audio and complete workshop operation still require native testing.

## 3. Tell SuperCollider where BuMoChi is

Open SuperCollider. Type this line, put the cursor on it, and press **Cmd-Return** (macOS) or **Ctrl-Return** (Linux, Windows):

```supercollider
Platform.userExtensionDir.postln;
```

The Post window shows a folder path. Put a link to (or a copy of) the whole `BuMoChi` folder inside that folder. On macOS, in a terminal:

```bash
mkdir -p "$HOME/Library/Application Support/SuperCollider/Extensions"
ln -s "/full/path/to/BuMoChi" "$HOME/Library/Application Support/SuperCollider/Extensions/BuMoChi"
```

Replace `/full/path/to/BuMoChi` with the real location. Then, in SuperCollider, choose **Language → Recompile Class Library**.

## 4. Install the starter assets and import a project

1. Download [BuMoChi_Assets](https://github.com/iani/BuMoChi_Assets) with **Code → Download ZIP** and extract it.
2. Evaluate `Platform.userAppSupportDir.postln;` in SuperCollider. Rename the extracted folder to `BuMoChiAssets` and put it directly inside the printed directory. Preserve existing work if that folder already exists.
3. In Godot, click **Import** and choose `BuMoChiAssets/GodotProjects/VMC_1_Avatar_M/project.godot`.
4. Wait for resource importing to finish. Use Godot 4.5 for these projects.
5. Evaluate `Bmc.assetEditor;` and click **Reload**. If Godot is not at its default location, set `Bmc.godotExecutable_` as described in [Installation](../Installation.md#configure-the-godot-executable).

## 5. The five-point check

Run these before the workshop. If any of them fails, write down the error message and bring it with you.

**Terminal**, at the root of the BuMoChi folder (Windows: use `python` instead of `python3`):

```bash
python3 --version
python3 PipelineApplications/BunrakuOSCEncoder.py --help
python3 PipelineApplications/BunrakuOSCDecoder.py --help
```

1. The first line prints Python 3.10 or later.
2. The second and third print a list of options, not an error.

**SuperCollider:**

```supercollider
Bmc.status;
```

3. The Post window shows a line containing `running: true` and `port: 57130`. If it says that `Bmc` is not defined, step 3 above did not work.

**Godot:**

4. The project `VMC_1_Avatar_M` opens without red error messages about missing add-ons, and pressing the Play button (top right) shows the character Ishidomaru standing still.

**XR-Animator:**

5. In the Asset Editor, click **Open XR-Animator**. The bundled application starts and shows your webcam image when you select the camera.

That is all. You do not need to configure any port numbers yet.

Next: [03 First Run: Move the Avatar](03%20First%20Run%20-%20Move%20the%20Avatar.md)
