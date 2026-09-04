# Deprecated sc-dance v1 playback draft

This directory preserves the pre-BuMoChi sc-dance playback experiment. Its classes loaded timestamped OSC recording folders through `SessionData`, attached them directly to the legacy `Avatar` and `Animator` classes, and exposed the recordings through `AvatarAssets` and related GUIs.

The current BuMoChi implementation uses `BmcClip`, `BmcClipLibrary`, `BmcClipPlayer`, `BmcAvatar`, Scenes, and Sequences instead. Nothing in the active `Bmc*` runtime depends on this archived subsystem.

Its historical documentation, HelpSource, implementation notes, guides, and dependent tests are preserved here with the classes, so they cannot be mistaken for current BuMoChi instructions.

Class sources use the `.sc.txt` suffix deliberately. SuperCollider recursively compiles `.sc` files below an Extensions directory, even when they are placed in a folder named `Deprecated`; the suffix prevents these historical drafts from entering the active class library.

`OscRecorder` and `OscRecorderPath` are not archived here. They remain active as the chunked, long-duration OSC recording implementation, using recording terminology rather than Scene terminology.
