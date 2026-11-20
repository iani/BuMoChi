# XR Animator platform bundles

Release ZIPs include the official XR-Animator 0.34.3 application for their target platform:

- `Bin/MacOS/Electron.app` — Apple silicon ARM64.
- `Bin/Windows/XR-Animator_electron-v35.1.2-win32-x64_SA/electron.exe` — Windows x64.
- `Bin/Linux/XR-Animator_electron-v35.1.2-linux-x64_SA/electron` — Linux x64.

The complete upstream folder hierarchy is preserved, including sibling content and accessories. Binary folders are ignored by Git and supplied in release assets. Source clones need a matching release package to use the Open XR-Animator button.

`Bmc.openXRAnimator;` selects the platform-specific path relative to the library. The Asset Editor button invokes the same method. It opens the application; camera selection and VMC output are configured in XR-Animator.

Packages are assembled from clean upstream archives rather than the developer's configured installation. Upstream downloads and SHA-256 hashes are pinned in `tools/release/upstream.json`. See the root README and release notes for platform validation status.

## Credits and licences

XR-Animator / System Animator is by Butz Yung / Anime Theme: https://github.com/ButzYung/SystemAnimatorOnline

Version source: https://github.com/ButzYung/SystemAnimatorOnline/releases/tag/XR-Animator_v0.34.3

The upstream README identifies CC BY-NC-SA 4.0 as its general licence and lists separate terms for third-party assets. Its complete README and the Electron licence notices remain inside the platform package. This packaging does not change those terms or modify upstream application source. macOS packaging overlays the supplied application content onto its supplied Electron runtime according to the upstream installation instructions.
