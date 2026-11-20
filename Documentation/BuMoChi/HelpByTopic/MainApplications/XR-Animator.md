# XR-Animator

XR-Animator supplies webcam body and face tracking to BuMoChi through native VMC output. It is optional when working only with recorded clips, including in [SceneCompositor](../SceneCompositor.md).

## Install and open

Download the OS-specific ZIP from [BuMoChi Releases](https://github.com/iani/BuMoChi/releases), following [Installation](../../Installation.md). It includes the matching native XR-Animator application, so a separate download is unnecessary. Keep the complete `XRAnimator/` folder inside the extracted BuMoChi folder.

After installing BuMoChi in SuperCollider, evaluate:

```supercollider
Bmc.assetEditor;
```

Click **Open XR-Animator**, grant camera access, and select your camera. The application path is resolved relative to the library. On Linux, restore execute permission on `XRAnimator/Bin/Linux/XR-Animator_electron-v35.1.2-linux-x64_SA/electron` if your extractor removed it, and install Electron's graphical runtime dependencies for your distribution.

## Connect to BuMoChi

Start the BMC pipeline in the Asset Editor and enable native VMC output in XR-Animator to host `127.0.0.1`, port `39537`. See [Setup](../Setup.md) for the complete pipeline and [Port Number Setup](../PortNumberSetup.md) for other routes. The direct XR-Animator-to-Godot diagnostic test uses `39539` instead; it bypasses BuMoChi's encoder.

## Source installations and notices

Git clones, **Source code (zip)** and **Code → Download ZIP** do not contain the application binaries. Developers using these routes must supply a compatible native application from the [upstream releases](https://github.com/ButzYung/SystemAnimatorOnline/releases). The browser version does not provide the native VMC output needed here.

XR-Animator is by Butz Yung / Anime Theme. Read `XRAnimator/README.md` and the notices preserved in the bundle for its licence and third-party asset terms. See the [upstream project](https://github.com/ButzYung/SystemAnimatorOnline) for application documentation.
