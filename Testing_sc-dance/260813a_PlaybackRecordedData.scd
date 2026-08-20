//: Function for playing back an array of recorded data
//
~playRecordedBunraku = { |recording, speed = 1.0|
	~bunrakuGodotAdapter = NetAddr("127.0.0.1", 39538);
    Routine({
        var firstTime;

        if(recording.isEmpty) {
            Error("The recording is empty").throw;
        };

        firstTime = recording.first[0];

        recording.do { |entry, index|
            var recordedTime = entry[0];
            var message = entry[1];

            if(index > 0) {
                (
                    (recordedTime - recording[index - 1][0])
                    / speed
                ).max(0).wait;
            };

            if(message[0] == '/bunraku/vmc/frame') {
                ~bunrakuGodotAdapter.sendMsg(*message);
            };
        };
    }).play(SystemClock);
};

//:------ USAGE ------
//: 0a. Enable input port from XR Animator
thisProcess.openUDPPort(57131);
//: 0b. Check whether data are arriving in SC
// Start posting incoming messages
OSCFunc.trace(true, true); // do not post messages from server.

//: 0c. Stop posting incoming messages
OSCFunc.trace(false, false);
//: 1. Record some data into OscRecorder.default

OscRecorder.default.startSession;
//: 2. After a while, stop the recording
OscRecorder.default.stopRecording;

//: 3. Ask the size of the recorded session data array:
OscRecorder.default.sessionData.size;

//: 4. Inspect the first recorded data item:
OscRecorder.default.sessionData.first;

//: 5. Inspect the last recorded data item:
OscRecorder.default.sessionData.last;

. Playback the data stored in OscRecorder.default.sessionData:

//: 6. Playback the last recorded session data

~playRecordedBunraku.(OscRecorder.default.sessionData);
//:
