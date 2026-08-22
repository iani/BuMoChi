// An in-memory recording of Bunraku Frame protocol-v1 messages.
//
// Each entry is [relativeCaptureTime, message]. The message itself retains the
// encoder timestamp at index 5. Keeping both clocks lets playback reproduce
// arrival timing without discarding the source's own time base.

BmcMocapClip : BmcClip { }
