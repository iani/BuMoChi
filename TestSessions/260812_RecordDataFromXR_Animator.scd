/*

-------- On XR Animator app: ---------
1. 3d Icon: Enable your webcam to track your movements
2. 4th Icon: Choose 5th option to enable Media Pipe tracking
3. 5th Icon: Switch VMC Protocol on.

Furthermore on XR Animator.

- To choose the port and IP where you are sending your VMC Messages:
	Choose the 5th Icon, top item
- To switch off the animation figure display
	Choose the 5th Icon, 5th numbered option: 5: 3D Avatar display.


*/

//: ------- Enable reception on XR Animator port and posting on
//  SuperCollider post window
// Open XR-Animator UDP Port
thisProcess.openUDPPort(39539);

// Start posting incoming messages
OSCFunc.trace(true, true); // do not post messages from server.

1 + 1;
