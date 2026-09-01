
//:Load buffers from all audiofiles folder in home directory
// Store each buffer in the global library under
// [\buffers, <filenamewithoutextension>]
// Do this at each ServerBoot.
// Enable this at StartUp (before the first ServerBoot)

// The library setup performs this automatically after the class library has
// been recompiled. Boot or reboot the server, then inspect the loaded buffers:
Library.global.at(\buffers).postln;

// Retrieve one buffer by its filename without the extension:
// Library.global.at(\buffers, \crickets);

// Reload the audio files manually while the server is running. Existing Bmc
// buffers are replaced; buffers for files removed from ~/audiofiles are freed:
Bmc.loadSoundFiles;

// Post each buffer name and its full source path:
Bmc.listAudioBuffers;

// Show the same information in a new ListView window.
// Select a buffer and press Enter or "Play selected" to play it.
// "Stop playback" frees every buffer-playback synth created by this window:
Bmc.showAudioBuffers;

