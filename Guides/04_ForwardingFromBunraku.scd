// 火 22  7 2025 18:35
\forwarder.addAdapter(OscControl, '/bunraku/avatar/frame', { "bunraku received".postln; });
//:
OscControl.enable;
//:
~godot = Avatar.localGodotAddr;
~mc = NetAddr("10.200.202.14", 22245);
\forwarder.addAdapter(OscControl, '/bunraku/avatar/frame', { | a, msg|
	~mc.sendMsg(*msg);
	~godot.sendMsg(*msg);
});
//:
\forwarder.removeAdapter(OscControl, '/bunraku/avatar/frame');
//:
