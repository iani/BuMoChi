//:Monitor incoming frames in SC
Bmc.showDispatcherStatus; 
//:start recording
Bmc.record(\zoom_test);
//:stop recording
Bmc.stopRecording;
//:List existing clips in post window
Bmc.clips
//:Show existing clips in separate gui window
Bmc.showClips;
//:Switch looping on and play clip;
Bmc.loop(true);
Bmc.play(\zoom_test);
