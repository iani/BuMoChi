BmcLiveSonification {
	var <synthName, <mappings, <synthArgs, <synth, <controller;
	var <publisher, <event;

	*new { |synthName, mappings, synthArgs|
		^super.new.init(synthName, mappings, synthArgs)
	}

	init { |argSynthName, argMappings, argSynthArgs|
		synthName = argSynthName.asSymbol;
		mappings = argMappings.asArray;
		synthArgs = argSynthArgs ?? { #[] };
		if(mappings.any { |mapping| mapping.isKindOf(BmcSonificationMapping).not }) {
			Error("BmcLiveSonification mappings must be BmcSonificationMapping objects").throw
		};
		^this
	}

	start { |argPublisher, argEvent = \rawFrame|
		this.stop;
		publisher = argPublisher ?? { Bmc.dispatcher };
		event = argEvent.asSymbol;
		mappings.do(_.reset);
		synth = Synth(synthName, synthArgs);
		controller = SimpleController(publisher);
		controller.put(event, { |model, what, firstArgument, secondArgument|
			var message = if(what == \frame) { secondArgument } { firstArgument };
			var time = if(what == \frame) { SystemClock.seconds } { secondArgument };
			var frame = BmcFrame.fromOSC(message);
			var controls = mappings.collect { |mapping|
				[mapping.control, mapping.value(frame, time)]
			}.flat;
			synth.set(*controls);
		});
		^this
	}

	stop {
		if(controller.notNil) { controller.remove; controller = nil };
		if(synth.notNil) { synth.free; synth = nil };
		^this
	}

	free { ^this.stop }
}
