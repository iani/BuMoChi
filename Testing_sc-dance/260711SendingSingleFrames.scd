
//: 土 11  7月 2026 12:53
//: Get all messages from the default avatar, store them in a
a = Avatar.default.messages;
//: Get the first message from a
a[0]
//: -------- SENDING -------
//: ------- Send the first message to Godot ---------
//: Get the address of godot, store it in d
d= Avatar.default.localGodot;
//: Send the first osc message to the local Godot address
d.sendMsg(*a[0]);

//: reset positions for tests
Avatar.play;
Avatar.stop;