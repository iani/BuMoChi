BmcGodotInspector {
	classvar godotExecutable, requestSerial = 0;

	*defaultExecutable {
		if(thisProcess.platform.name == \osx) {
			^"/Applications/Godot.app/Contents/MacOS/Godot"
		};
		^"godot"
	}

	*godotExecutable { ^godotExecutable ?? { this.defaultExecutable } }
	*godotExecutable_ { |path| godotExecutable = path.asString.standardizePath; ^godotExecutable }

	*applicationDirectory {
		var classDirectory = PathName(this.filenameSymbol.asString).pathOnly;
		^(classDirectory +/+ "../../PipelineApplications").standardizePath
	}

	*scriptPath { ^this.applicationDirectory +/+ "bmc_godot_inspector.gd" }
	*serviceStartPath { ^this.applicationDirectory +/+ "start_bumochi_godot_service.sh" }
	*serviceDirectory { ^"/tmp/bumochi-godot-service" }
	*serviceReady { ^File.exists(this.serviceDirectory +/+ "service.ready") }

	*nextRequestID {
		requestSerial = requestSerial + 1;
		^"inspect_%_%".format(
			Date.localtime.rawSeconds.asInteger,
			requestSerial
		)
	}

	*inspect { |projectName, action|
		^this.submit(projectName, action, false)
	}

	*inspectData { |projectName, action|
		^this.submit(projectName, action, true)
	}

	*launchScene { |projectName, scenePath, ports, action|
		^this.submitRequest(\launch, projectName, scenePath.asString,
			ports ?? { #[] }, action, true)
	}

	*runtimeStatus { |projectName, scenePath, ports, action|
		^this.submitRequest(\status, projectName, scenePath.asString,
			ports ?? { #[] }, action, true)
	}

	*stopScene { |projectName, scenePath, action|
		^this.submitRequest(\stop, projectName, scenePath.asString, #[], action, true)
	}

	*submit { |projectName, action, returnData = false|
		^this.submitRequest(\inspect, projectName, this.scriptPath, #[],
			action, returnData)
	}

	*submitRequest { |requestAction, projectName, argument, ports, action, returnData = false|
		var projectPath = BmcGodotProjectLibrary.projectPath(projectName);
		var executable = this.godotExecutable;
		var requestID = this.nextRequestID;
		var outputPath = this.serviceDirectory +/+ (requestID ++ ".json");
		var statusPath = this.serviceDirectory +/+ (requestID ++ ".status");
		var requestPath = this.serviceDirectory +/+ (requestID ++ ".request");
		var file;
		if(this.serviceReady.not) {
			Error("BuMoChi Godot service is not running. Start: %"
				.format(this.serviceStartPath)).throw
		};
		if(executable.contains($/) and: { File.exists(executable).not }) {
			Error("Godot executable not found: %".format(executable)).throw
		};
		file = File(requestPath, "w");
		if(file.isOpen.not) { Error("Could not create Godot service request").throw };
		file.write("%\n%\n%\n%\n%\n%\n".format(
			requestAction, executable, projectPath, argument, outputPath,
			ports.collect(_.asInteger).join(",")));
		file.close;
		this.awaitStatus(projectName, outputPath, statusPath, action, 65, returnData);
		^requestID
	}

	*awaitStatus { |projectName, outputPath, statusPath, action, timeout = 65, returnData = false|
		Routine {
			var waited = 0.0;
			var status, lines, error;
			while { File.exists(statusPath).not and: { waited < timeout } } {
				0.1.wait;
				waited = waited + 0.1;
			};
			if(File.exists(statusPath)) {
				status = File.readAllString(statusPath);
				lines = status.split($\n);
				if(lines.first != "ok") { error = lines.drop(1).join("\n") };
				File.delete(statusPath);
			} {
				error = "Godot service timed out while inspecting %".format(projectName)
			};
			this.deliver(projectName, outputPath, action, error, returnData)
		}.play(AppClock)
	}

	*deliver { |projectName, outputPath, action, error, returnData = false|
		var json, result, dataPath = outputPath ++ ".scd";
		if(File.exists(outputPath)) { json = File.readAllString(outputPath) };
		if(json.isNil and: { error.isNil }) {
			error = "Godot inspection produced no output for %".format(projectName)
		};
		// Successful replies are deliberately quiet. Runtime status is polled
		// continuously by the Asset Editor and must not flood the post window.
		if(error.notNil) { error.warn };
		if(returnData and: { error.isNil }) {
			if(File.exists(dataPath)) {
				result = File.readAllString(dataPath).interpret
			} {
				error = "Godot service produced no SuperCollider data for %".format(projectName)
			}
		} {
			result = json
		};
		action.value(result, error, outputPath)
	}
}
