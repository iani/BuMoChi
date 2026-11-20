// Run in a separate test language session; no live network output is sent.
(
var check = { |ok, message| if(ok.not) { Error(message).throw } };
var makeFrame = { |value|
    var pose = BmcPose.neutral;
    pose.put(\Hips, [value, 0, 0, 0, 0, 0, 1]);
    BmcFrame("live", "camera-test", 1, 0, pose)
};
Routine({
    var live, target, other, player, clip, compositor, sent = List.new;
    var editor, set, recorded, status;
    try {
        Bmc.stopCompositor;
        Bmc.forwardDecoder_(false);
        live = BmcAvatar(\live).vmcPort_(39539).output_({ sent.add(\live) });
        target = BmcAvatar(\target).vmcPort_(39539).output_({ sent.add(\target) });
        other = BmcAvatar(\other).vmcPort_(39540).output_({ sent.add(\other) });
        live.receiveFrame(makeFrame.(1));
        other.receiveFrame(makeFrame.(1));
        clip = BmcClip([[0, makeFrame.(9).asOSCMessage], [0.3, makeFrame.(9).asOSCMessage]]);
        player = BmcClipPlayer(clip, target, \testPlayer);
        player.play;
        0.05.wait;
        target.receiveFrame(makeFrame.(2)); // live source arrives AFTER playback
        check.(Bmc.bone(target.composeFrame.asOSCMessage, \Hips)[0] == 9, "Late live input overrode playback");
        compositor = BmcCompositor({ [live, target, other] });
        compositor.tick;
        check.(sent.includes(\target) and: { sent.includes(\other) } and: { sent.includes(\live).not }, "Same-port arbitration failed");
        player.pause;
        check.(target.hasPlaybackSource, "Pause lost playback ownership");
        player.mute;
        sent.clear; compositor.tick;
        check.(sent.includes(\live), "Mute did not release port");
        player.unmute; player.stop;
        player.play;
        0.4.wait;
        check.(target.hasPlaybackSource.not, "Natural completion retained playback source");
        sent.clear; compositor.tick;
        check.(sent.includes(\live), "Live output did not resume");
        player.play;
        0.05.wait;
        player.stop;
        check.(target.hasPlaybackSource.not, "Manual stop retained playback source");

        // Exercise the editor Play handler with an unassigned clip and no presets,
        // without starting a scene or emitting network output.
        recorded = Bmc.library.add(\playbackPriorityTest, clip.copy);
        check.(recorded.notNil and: { recorded.size > 1 }, "Recorded clip could not be loaded");
        check.(Bmc.clipPresets(\playbackPriorityTest).isEmpty, "Expected new clip without presets");
        editor = BmcAssetEditor.newCopyArgs;
        set = { |name, value| editor.instVarPut(BmcAssetEditor.instVarNames.indexOf(name), value) };
        set.(\scenePresetAssignments, IdentityDictionary.new);
        set.(\avatarMappings, IdentityDictionary.new);
        set.(\selectedClipName, \playbackPriorityTest);
        set.(\selectedProject, \testProject);
        set.(\selectedScene, "test.tscn");
        set.(\inspection, (scenes: [(path: "test.tscn", avatarCandidates: [(name: \playbackTest, nodePath: "Test", vmcPort: 39539)])]));
        set.(\avatarList, ListView().items_(["playbackTest"]).value_(0));
        status = TextView(); set.(\statusText, status);
        editor.playAssignedPreset;
        check.(Bmc.player(\clipEditor).isPlaying, "Editor did not start unassigned clip");
        check.(Bmc.player(\clipEditor).endFrame == (recorded.size - 1), "Editor truncated clip");
        check.(Bmc.player(\clipEditor).avatar.vmcPort == 39539, "Editor routed to wrong port");
        editor.stopAssignedPreset;
        ("PLAYBACK_PRIORITY_PASS: recorded clip frames=" ++ recorded.size ++ " duration=" ++ recorded.duration).postln;
        0.exit;
    } { |error| error.reportError; 1.exit };
}).play(AppClock);
)
