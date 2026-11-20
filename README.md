# BuMoChi

BuMoChi connects webcam motion capture, recorded movement, live coding, sound synthesis and Godot avatar scenes.

## Download the workshop package

Open [BuMoChi Releases](https://github.com/iani/BuMoChi/releases) and download the ZIP matching your computer from the release's **Assets** list:

| Computer | Package suffix |
|---|---|
| Apple silicon Mac | `macos-arm64.zip` |
| Windows 64-bit Intel/AMD | `windows-x64.zip` |
| Linux 64-bit Intel/AMD | `linux-x64.zip` |

Each ZIP contains a `BuMoChi` folder with the SuperCollider library, Python helpers, OSCGroups binaries and the matching **XR-Animator 0.34.3 Electron application**. The normal GitHub **Code → Download ZIP** and source clones do **not** include the XR-Animator binaries. Intel Macs and ARM Windows/Linux are not covered by these three packages.

These workshop releases are **prereleases**: the macOS application launch has been tested locally; Windows and Linux bundles require native camera/audio and end-to-end workshop acceptance testing. See each release's notes for validation scope.

## Install the separate prerequisites

- [SuperCollider](https://supercollider.github.io/downloads/).
- [Python 3](https://www.python.org/downloads/), version 3.10 or later. The pipeline uses the standard library. On Windows enable **Add Python to PATH** and verify `python --version`; on macOS/Linux verify `python3 --version`.
- [Godot 4.5 standard](https://godotengine.org/download/archive/4.5-stable/), matching the prepared projects. The .NET build is not needed. Install/extract it wherever you prefer.
- On Linux, install `lsof` for Godot process/port checks and the graphical runtime dependencies required by Electron and Godot for your distribution. The upstream XR-Animator readme identifies Ubuntu as its tested Linux environment.

Godot, Python, SuperCollider and the starter asset repository are separate downloads; this package is not a self-contained installer.

## Install BuMoChi

In SuperCollider evaluate:

```supercollider
Platform.userExtensionDir.postln;
```

Move the extracted **BuMoChi** folder into that directory, or create a symbolic link there to its permanent location. Do not install duplicate copies. Select **Language → Recompile Class Library** and check the Post window for errors.

## Install the starter assets

Download [BuMoChi_Assets](https://github.com/iani/BuMoChi_Assets) with **Code → Download ZIP**, then extract it. In SuperCollider evaluate:

```supercollider
Platform.userAppSupportDir.postln;
```

Rename the extracted `BuMoChi_Assets-main` folder to **BuMoChiAssets** and place it directly inside the printed directory. Avoid an extra enclosing folder: `GodotProjects` and `AnimationClips` must be directly inside `BuMoChiAssets`.

For a Git checkout, run the following from the directory printed by SuperCollider:

```sh
git clone https://github.com/iani/BuMoChi_Assets.git BuMoChiAssets
```

On macOS the resulting folder is normally `~/Library/Application Support/SuperCollider/BuMoChiAssets`. Use SuperCollider's printed path on Windows and Linux. If an assets folder already exists, preserve your work and merge examples carefully; alternatively use **Select Asset Folder** in the Asset Editor to select another location.

The starter repository contains three basic Godot avatar projects and motion clips. `GodotProjects/BBDemos`, Photos, SoundFiles and Videos are excluded. BuMoChi creates any missing empty working folders automatically. Godot needs to import each project's resources on first use.

## Tell BuMoChi where Godot is

The default is `/Applications/Godot.app/Contents/MacOS/Godot` on macOS, or `godot` on the system PATH elsewhere. If you chose another location, set the **executable**, not the containing folder:

```supercollider
// macOS example; replace with your actual location
Bmc.godotExecutable_("/Applications/Godot.app/Contents/MacOS/Godot");

// Windows example; forward slashes avoid backslash escapes
Bmc.godotExecutable_("C:/Tools/Godot/Godot_v4.5-stable_win64.exe");

// Linux example; replace with your actual executable
Bmc.godotExecutable_("/home/YOUR_USER/Applications/Godot_v4.5-stable_linux.x86_64");
```

Run **only the line for your system**, with the actual path. The setting is saved under SuperCollider's user application-support directory and reused after recompilation. On macOS select the executable inside the `.app` bundle as shown above.

## First run

```supercollider
Bmc.assetEditor;
```

1. Click **Start BMC Pipeline** and wait for the ready status.
2. Select a Godot project, then a scene; click **Open Scene**.
3. Select an avatar target and an existing animation clip, then click **Play**. Click **Stop** to end playback.
4. When ready for live capture, click **Open XR-Animator**. Select your camera and enable VMC output to `127.0.0.1:39537` in that application.

The XR-Animator path is resolved relative to BuMoChi. Windows uses the included Python local-pipeline launcher; macOS/Linux use the Bash launcher. The Windows automatic startup is local-only; advanced OSCGroups networking requires separate client configuration using the included Windows binary.

If the Linux archive extractor drops execute permissions, restore them on `XRAnimator/Bin/Linux/XR-Animator_electron-v35.1.2-linux-x64_SA/electron` before opening XR-Animator. Follow upstream platform instructions for any additional runtime requirements.

See [Tutorial](Documentation/BuMoChi/Tutorial/00%20Start%20Here.md) for the workshop and [setup overview code](Documentation/BuMoChi/Tutorial/BuMoChi_Workshop01_SetupAndOverview.scd) for the opening exercise. Some older tutorials describe installing applications individually; this README describes the packaged release layout.

## Included third-party software

XR-Animator is by **Butz Yung / Anime Theme**. The packages preserve its upstream directory layout and notices, using the [official 0.34.3 release](https://github.com/ButzYung/SystemAnimatorOnline/releases/tag/XR-Animator_v0.34.3). Its README describes the general CC BY-NC-SA 4.0 licence and separate third-party asset terms; bundling does not relicense these components. Electron and OSCGroups retain their own licences. See `XRAnimator/README.md` and the notices within each bundle.

## Further documentation

BuMoChi is a framework for creating interactive animations with sonification using free VMC-capable motion capture tools, SuperCollider, and the Godot Gaming Engine. It contains a SuperCollider library and a collection of python scripts that connect motion capture tools such as XR-Animator to SuperCollider and SuperCollider to Godot.

The framework includes tools for recording animation data, configuring the data playback to control specified parts of selected avatars in Godot Scenes in various ways, and for sharing data from multiple motion capture or control sources over the network. With it one can and perform pieces with multiple coders and performers over the network.

For installation instructions, see [Installation](Documentation/BuMoChi/Installation.md).

For setting up the system pipeline to enable animation, see [Setup](Documentation/BuMoChi/HelpByTopic/Setup.md).

For a guide to reading the documentation see [Essential Documentation Reading Order](Documentation/BuMoChi/HelpByTopic/00%20Essential%20Documentation%20Reading%20Order.md).

For introductory examples and first steps, see [Getting Started](Documentation/BuMoChi/Getting%20Started.md).

The GUI tools for creating a piece using animation capture, configuration and coding of animation sequences and sound interaction, see [Creating A Piece](Documentation/BuMoChi/HelpByTopic/Creating%20A%20Piece.md).

For more extensive introduction, see [User Guide](Documentation/BuMoChi/UserGuide.md).

---

BuMoChiは、VMCに対応した無料のモーションキャプチャツール、SuperCollider、Godotゲームエンジンを使用して、サウンド生成を伴うインタラクティブなアニメーションを制作するためのフレームワークです。SuperColliderライブラリと、XR-AnimatorなどのモーションキャプチャツールをSuperColliderへ、さらにSuperColliderをGodotへ接続するPythonスクリプト群で構成されています。

このフレームワークには、アニメーションデータを記録するためのツール、データの再生方法を設定してGodotシーン内の選択したアバターの特定部位をさまざまな方法で制御するためのツール、そして複数のモーションキャプチャまたは制御ソースからのデータをネットワーク経由で共有するためのツールが含まれています。これにより、複数のコーダーとパフォーマーがネットワーク経由で共同して作品を上演できます。

インストール手順については、[インストール](Documentation/BuMoChi/インストール.md)を参照してください。

システムパイプラインを設定してアニメーションを有効にする方法については、[BuMoChi セットアップ](Documentation/BuMoChi/HelpByTopic/BuMoChi%20セットアップ.md)を参照してください。

ドキュメントを読むためのガイドについては、[必須ドキュメントの読書順序](Documentation/BuMoChi/HelpByTopic/00%20Essential%20Documentation%20Reading%20Order.md)を参照してください。

入門例と最初の手順については、[はじめに](Documentation/BuMoChi/はじめに.md)を参照してください。

アニメーションのキャプチャ、アニメーションシーケンスの設定とコーディング、およびサウンドとのインタラクションを用いて作品を制作するためのGUIツールについては、[作品の制作](Documentation/BuMoChi/HelpByTopic/Creating%20A%20Piece.md)を参照してください。

より詳しい紹介については、[BuMoChi ユーザーガイド](Documentation/BuMoChi/BuMoChi%20ユーザーガイド.md)を参照してください。
