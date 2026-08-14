# BuMoChi installation and external dependencies

BuMoChi is distributed as source code. Third-party applications are deliberately
not copied into this repository: users download them from their official
publishers so that they receive the appropriate version, licence information,
platform build, and security updates.

## What this repository includes

- The BuMoChi SuperCollider classes, examples, and documentation.
- The Bunraku OSC/VMC encoder and decoder.
- Protocol tests and diagnostic senders.
- A canonical Godot VMC test project.

## What users install separately

### 1. SuperCollider

Download SuperCollider from its official website:

<https://supercollider.github.io/downloads>

Clone or copy BuMoChi into the SuperCollider user extensions directory, or put
a symbolic link to the repository there. To display the user support directory,
evaluate this in SuperCollider:

```supercollider
Platform.userExtensionDir.postln;
```

After installing or linking BuMoChi, recompile the class library from the
SuperCollider IDE.

### 2. Python 3

The scripts in `Testing/` use the Python standard library and do not require a
package installation. Check the interpreter with:

```sh
python3 --version
```

### 3. Godot 4

Download Godot from its official website:

<https://godotengine.org/download/>

Import `Testing/GodotVMCReference/project.godot` into Godot. This project is the
reference renderer for the pipeline tests and listens for standard VMC on UDP
port `39539`.

### 4. XR Animator

Download the native Windows, Linux, or macOS XR Animator build from the
developer's official GitHub releases page:

<https://github.com/ButzYung/SystemAnimatorOnline/releases>

Project information, documentation, credits, and licence terms are maintained
by the XR Animator developer here:

<https://github.com/ButzYung/SystemAnimatorOnline>

Important:

- Use a native desktop/Electron release. XR Animator's VMC output is an
  operating-system/native feature and is not provided by the browser-only web
  version.
- Choose the archive matching the operating system and CPU architecture.
- Extract or install XR Animator outside the BuMoChi repository—for example in
  the user's normal Applications directory.
- Read the licence and third-party asset notices included with the downloaded
  version. XR Animator states a general CC BY-NC-SA 4.0 licence for adaptation
  of its source, while bundled third-party assets may have separate terms.
- BuMoChi does not redistribute, modify, or automatically download XR Animator.

For the direct reference test, configure XR Animator's VMC destination as:

```text
127.0.0.1:39539
```

For the Bunraku encoder tests, configure its VMC destination as:

```text
127.0.0.1:39538
```

### 5. OSCGroups — required only for networked tests

OSCGroups is an external network transport maintained by Ross Bencina:

<https://github.com/RossBencina/oscgroups>

It is not required for the local XR Animator → Godot reference test or the
local Python/SuperCollider diagnostic tests. Install the OSCGroups client only
when testing the distributed pipeline.

## Recommended first verification

Open a terminal in `Testing/` and follow `Testing/README.md` in order:

1. Test 0: diagnostic sender → Godot.
2. Test 1: XR Animator → Godot.
3. Test 2: XR Animator → Bunraku encoder → OSCGroups → decoder → Godot.
4. Test 3: SuperCollider → decoder → Godot.
5. Test 4: complete XR Animator → OSCGroups → SuperCollider → Godot chain.

Do not continue to the next test until the preceding test passes. This keeps
installation problems separate from network, encoding, SuperCollider, and
rendering problems.

## Distribution policy

A complete BuMoChi release should contain its own source, tests, documentation,
and small original example assets. It should provide official download links
for external applications rather than vendoring their application bundles.
Generated and downloaded material such as `.DS_Store`, `__pycache__`, `.godot`
caches, Electron applications, XR Animator archives, and platform binaries must
remain outside Git unless their licence and release purpose have been reviewed
explicitly.

For archival or performance deployment, record the versions actually tested in
a release note. Do not encode a permanently “latest” XR Animator download URL;
the official releases page should remain the source of truth.
