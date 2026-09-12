/*
  EXPLORER — audition your mapping without a camera or the bridge.

  Evaluate this file after dance-lab.scd (or after synths + receive + profile). A window opens
  with 7 sliders (the params) and 5 buttons (the events). Moving a slider calls ~onParamsA /
  ~onParamsB exactly like an incoming /dance/A/params message would; a button calls ~onEventA.
  So whatever you write in profile-template.scd, you can hear it here by hand.

  Choose the dancer (A or B) with the menu at the top. "Stop" calls the stop hook.
*/
(
// GUI must be built on the AppClock; defer makes this also work from a Routine or sclang -D.
{
var win, dancerMenu, sliders, strengthSlider, tick;
var names = ~paramNames ?? { #[\intensity, \brightness, \pitch, \width, \pan, \density, \space] };
var kinds = ~eventKinds ?? { #[\hit, \accent, \sweep, \freeze, \release] };
var currentDancer = { if(dancerMenu.value == 0) { ~dancerA } { ~dancerB } };
var currentHooks = {
  if(dancerMenu.value == 0) { [~onParamsA, ~onEventA, ~onStopA] } { [~onParamsB, ~onEventB, ~onStopB] }
};
var sendParams = {
  var d = currentDancer.value;
  names.do { |k, i| d[k] = sliders[i].value };
  d.t = Main.elapsedTime;
  d.frames = d.frames + 1;
  currentHooks.value[0].value(d);
};

win = Window("dance explorer — sliders = params, buttons = events", Rect(100, 100, 420, 360)).front;
win.view.decorator = FlowLayout(win.view.bounds, 10@10, 6@6);

StaticText(win, 60@20).string_("dancer");
dancerMenu = PopUpMenu(win, 60@20).items_(["A", "B"]).value_(0);
dancerMenu.action = { names.do { |k, i| sliders[i].value = currentDancer.value[k] } };
StaticText(win, 260@20).string_("  ← same hooks as the live stream");

sliders = names.collect { |k|
  var sl;
  StaticText(win, 80@20).string_(k.asString);
  sl = Slider(win, 300@20).value_(0.5);
  sl.action = sendParams;
  sl;
};

StaticText(win, 400@20).string_("events (strength = slider below)");
strengthSlider = Slider(win, 400@20).value_(0.8);
kinds.do { |kind|
  Button(win, 74@28).states_([[kind.asString]]).action_({
    var d = currentDancer.value;
    d.lastEvent = kind;
    d.lastStrength = strengthSlider.value;
    d.events = d.events + 1;
    currentHooks.value[1].value(kind, strengthSlider.value, d);
  });
};

Button(win, 400@28).states_([["Stop (calls ~onStop)"]]).action_({
  currentHooks.value[2].value(currentDancer.value);
});

// Keep calling the params hook ~20×/s while the window is open, like a real stream would.
tick = Routine { loop { sendParams.value; 0.05.wait } }.play(AppClock);
win.onClose = { tick.stop };

"explorer: window open — move a slider, press an event".postln;
}.defer;
)
