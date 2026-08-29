For reliable Waidayo facial tracking:

- Minimum practical iPhone: **iPhone XS, XS Max, or XR**
- Recommended inexpensive choice: **iPhone 11 or newer**
- Also compatible: subsequent Face ID models in the iPhone 12, 13, 14, 15, 16 and newer families
- Required OS: **iOS 15.7 or later**

Avoid the following for facial tracking:

- iPhone SE models: they lack the front TrueDepth/Face ID camera.
- iPhone 6s through iPhone 8: the App Store may permit installation, but they lack TrueDepth.
- iPhone X: it has Face ID, but uses the older A11 chip; Waidayo’s description specifies A12 Bionic or later. The safe minimum is therefore XS/XR.

For MacBooks, the App Store states:

- **MacBook Air M1 or later**
- **MacBook Pro M1 or later**
- **macOS 13 Ventura or later**
- Intel MacBooks are not supported by the current iOS/iPadOS app listing.

However, an Apple-silicon MacBook should not be considered a replacement for the iPhone’s TrueDepth facial capture. Its ordinary webcam does not provide the same ARKit face-tracking data. For BuMoChi, the sensible arrangement is:

```
Face ID iPhone running Waidayo
    → VMC over the local network
    → MacBook running BuMoChi / SuperCollider
    → BunrakuOSCDecoder
    → Godot
```

My practical recommendation would be a used **iPhone 11, 12, or 13**. An XR/XS is the technical minimum, but an iPhone 11 or later gives you a safer margin for OS support and sustained real-time tracking.

Source: [Waidayo’s current Apple App Store listing](https://apps.apple.com/us/app/waidayo/id1513166077).