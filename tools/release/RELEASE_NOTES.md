# BuMoChi workshop packages

Three ZIPs provide the same BuMoChi library and Python helpers with platform-specific XR-Animator 0.34.3: macOS Apple silicon, Windows x64, and Linux x64. Download only the appropriate ZIP, not the source-code archive. SHA-256 checksum files accompany the packages.

Install SuperCollider, Python 3.10+ and Godot 4.5 standard separately. Download or clone https://github.com/iani/BuMoChi_Assets into `Platform.userAppSupportDir +/+ "BuMoChiAssets"`. Full instructions are in the repository README.

Includes the Asset Editor Open XR-Animator button, a library-relative app path, persistent Godot executable configuration and a Python local-pipeline launcher for Windows. Existing workshop development changes to the scene compositor and playback are included.

Validation: SuperCollider class compilation and bundled application launch checked on macOS; Python unit tests and package structure/checksums checked. Windows/Linux camera, audio, Godot rendering and full workshop behaviour have not been verified on native hardware. These are prerelease workshop packages, not fully tested cross-platform installers. macOS first-launch security prompts on a fresh machine may differ from the local test.

XR-Animator by Butz Yung / Anime Theme is redistributed with its upstream notices and licence information. No upstream application code is modified. Godot, SuperCollider, Python, and starter assets are not included in these ZIPs.
