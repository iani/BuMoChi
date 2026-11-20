# 02 Before the Workshop: Installation

Please complete this chapter **before** you arrive. Downloads are large and the workshop network may be slow. The full reference is [Installation](../Installation.md); this is the short version.

## 1. Download and install four things

| What | Where | Notes |
|---|---|---|
| **SuperCollider** | <https://supercollider.github.io/downloads> | Current stable version |
| **Godot 4.5** | <https://godotengine.org/download/archive/4.5-stable/> | Standard build, not the .NET build. Use 4.5: the bundled projects were made with it |
| **XR-Animator** | <https://github.com/ButzYung/SystemAnimatorOnline/releases> | The native desktop application, not the browser version. Allow camera access when asked |
| **Python 3** | <https://www.python.org/downloads/> | Often already installed. No extra packages are needed |

## 2. Get BuMoChi

```bash
git clone https://github.com/iani/BuMoChi.git
```

Or download the repository as a ZIP file and unpack it. Put the `BuMoChi` folder somewhere permanent, for example your Documents folder, and do not move it afterwards.

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

## 4. Import the Godot project

1. Start Godot. The Project Manager opens.
2. Click **Import** and select `BuMoChi/GodotProjects/VMC_1_Avatar_M/project.godot`.
3. Open the project and wait until Godot has finished importing its files. The first time takes a minute or two.
4. If Godot offers to upgrade the project to a newer version, decline and install Godot 4.5 instead.

## 5. The five-point check

Run these before the workshop. If any of them fails, write down the error message and bring it with you.

**Terminal**, at the root of the BuMoChi folder:

```bash
python3 --version
python3 PipelineApplications/BunrakuOSCEncoder.py --help
python3 PipelineApplications/BunrakuOSCDecoder.py --help
```

1. The first line prints a version number starting with 3.
2. The second and third print a list of options, not an error.

**SuperCollider:**

```supercollider
Bmc.status;
```

3. The Post window shows a line containing `running: true` and `port: 57130`. If it says that `Bmc` is not defined, step 3 above did not work.

**Godot:**

4. The project `VMC_1_Avatar_M` opens without red error messages about missing add-ons, and pressing the Play button (top right) shows the character Ishidomaru standing still.

**XR-Animator:**

5. The application starts and shows your webcam image when you select the camera.

That is all. You do not need to configure any port numbers yet.

Next: [03 First Run: Move the Avatar](03%20First%20Run%20-%20Move%20the%20Avatar.md)
