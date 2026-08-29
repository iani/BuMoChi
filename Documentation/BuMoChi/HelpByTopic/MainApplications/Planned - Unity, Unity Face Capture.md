

The official Unity counterpart is **Unity Face Capture**, used with Unity’s **Live Capture** package.

Pipeline:

```
iPhone TrueDepth camera
    → Unity Face Capture app
    → local network
    → Unity Live Capture package
    → facial blend shapes and head pose on a Unity character
```

You need:

- The free [Unity Face Capture iPhone app](https://apps.apple.com/us/app/unity-face-capture/id1544159771).
- Unity Editor 2021.3 or later.
- Unity’s `Live Capture` package, installed through Package Manager.
- An iPhone supporting ARKit facial tracking—preferably iPhone XS/XR or newer.
- The iPhone and Unity workstation on the same private network.

In Unity, you create a `Companion App Server`, connect the iPhone app, add an `ARKit Face Device`, and map its ARKit blend-shape channels to the character’s facial blend shapes. Unity supports per-character mapping, amplification and damping. [Unity setup documentation](https://docs.unity3d.com/Packages/com.unity.live-capture@4.0/manual/face-capture.html).

Important distinction: Unity Face Capture does **not** normally transmit VMC. It connects directly to the Unity Editor using Unity’s companion-app protocol. Therefore it is analogous to Waidayo in function, but not a drop-in replacement in the BuMoChi VMC/OSC pipeline.

There is also a longevity concern: Unity states that support for the Face Capture app and Live Capture is scheduled to end with Unity 6.1. It is usable now, but I would avoid making it the only foundation of a long-term system. For BuMoChi, Waidayo or another app that emits VMC/OSC remains more flexible; for a self-contained Unity experiment, Unity Face Capture is the most direct option.