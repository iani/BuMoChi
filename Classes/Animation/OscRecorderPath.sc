// 金 27  6 2025 08:55
// Generate the path at the start of a new recording, in
// response to method "recordingPath".
// OscRecorder calls recordingPath when starting to record
// in order to create a new folder to store the files of this recording.
// Generate the full folder path only.  OscRecorder generates
// the filename and appends it to the folder path.
//
// Generate paths for OscRecorder:
// folder path = rootDir +/+ dayFolder +/+ recordingFolder
// rootDir: Platform.userAppSupportDir/OSC_Data on all platforms.
// dayFolder: YYMMDD stamp of the date of the recording
// 				(Date.getDate.dayStamp)
// recordingFolder: YYMMDD_HHMMSS stamp of the start time of the recording
// 				(Date.localtime.stamp)
// file header: custom.  Defaults to "" (null string)
// time stamp: YYMMDD_HHMMSS stamp of the start time of this file data
//

OscRecorderPath : NamedInstance {
	var <rootDir;

	init { rootDir = this.makeRootDir }

	makeRootDir {
		^PathName(Platform.userAppSupportDir +/+ "OSC_Data");
	}
	recordingPath {
		^rootDir.fullPath
		+/+ Date.getDate.dayStamp
		+/+ Date.localtime.stamp;
	}
}

	/*
	*makeDirectory {
		// is called by enable inside a fork, therefore does not delay execution.
		var errorCode;
		this.makeDailySubfolderTimestamp;
		// make directories for windows using File.mkdir.
		if (thisProcess.platform.class.asSymbol === 'WindowsPlatform') {
			File.mkdir(this.folderPath);
		}{
			// run command synchronously and collect error:
			errorCode = ("mkdir -p " ++ this.folderPath.replace(" ", "\\ ")).systemCmd;
			// TODO: find out which error signifies a problem, and catch it here
			// if (errorCode == ??? ) { issue a warning }
		}
	}
	*/
