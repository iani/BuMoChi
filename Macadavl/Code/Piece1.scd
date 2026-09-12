/*
MACADAVL — Piece V1 / seven-control OSC prototype / 90 seconds / 128 BPM.

Evaluate this entire block once, then evaluate the following line separately:

    ~pieceV1[\start].value;

Stop early: ~pieceV1[\stop].value;   or Cmd+.
Status:     ~pieceV1[\status].value;

Run tools/sc-bridge/bridge.py and choose the SuperCollider engine in the Dance
Stage, or send the following current OSC contract directly to NetAddr.langPort:
  /dance/A/params intensity brightness pitch width pan density space (7 numbers)
  /dance/A/event  kind strength (optional: hit, accent, sweep, freeze, release)
  /dance/A/stop   (no arguments; ends the piece)
All controls and strengths are 0..1. Dancer B: ~pieceV1[\dancer] = "B";
The bridge defaults to UDP 57120; adjust --osc-port if NetAddr.langPort differs.
No raw arm coordinates, motion files, external samples or extensions needed.
Start always resets the score and RAM. The fixed seed makes rehearsals repeatable.
The audio server boots if necessary; the 90-second score begins when it is ready.
Optional before starting: ~pieceV1[\masterLevel] = 0.65;  // 0..1
                         ~pieceV1[\seed] = 1979;
For rehearsal WITHOUT an OSC source: ~pieceV1[\inputMode] = \score;
Restore live controls:              ~pieceV1[\inputMode] = \osc;

The vocabulary is exactly MAPPING-PROFILES.md / "Decide on paper":
  intensity -> loudness / crescendo; brightness -> filter opening;
  pitch -> register; width -> stereo spread; pan -> left/right;
  density -> note activity; space -> reverb.
  hit -> kick + accent; accent -> changing percussive colour;
  sweep -> brief filter/noise rise; freeze -> subdued/drowned texture;
  release -> low impact + bass entry (the prototype's beat drop).

LIVE MODE (default): the seven received controls shape the sound directly.
Slow continuous changes of intensity produce smooth crescendos. Sudden rises
of intensity/brightness produce varied accents. A fast fall of pitch from high
to low, with strong intensity, produces a drop. These are CONTROL gestures,
not anatomical classifiers: arm behaviour depends on the sender's mapping.
Explicit incoming events also work. To use only explicit accent/drop events:
    ~pieceV1[\controlGestures] = false;
The 90-second form increases grid disruption and RAM layers independently.
Intensity/density supply most of the activity; the quiet pulse remains a floor.
On stream loss (>0.75 s), live activity fades to that floor, while RAM phrases
continue. Reacquisition does not trigger an accent/drop. Stop aborts everything.

Example form in optional score mode (seconds). Live mode keeps the duration,
increasing irregularity and RAM entries, with crescendos/accents/drops from OSC:
  0–12   subtle, regular kick and offbeat hat; low D-minor pulse enters at 8.
  12–24  sustained crescendo; increasingly sharp, varied accents; first memory.
  24     first scheduled drop in optional score mode.
  24–50  more syncopation, missing beats and drifting phrase layers; second build.
  50     second scheduled drop in optional score mode.
  50–73  two, then three memories; score mode suspends at 69 and drops at 73.
  73–86  dense fractured techno, where remembered phrases disturb the grid.
  86–90  all sound, including reverb, fades to silence. No tail extends the score.

Memory is RAM-only: a 12-second circular control history sampled at 20 Hz,
replayed as 2.5–5-second phrases at drifting rates, at most three voices.
A small share of replayed controls feeds the next recording, so generations of
phrases overlap. In live mode these are the dancer's received control segments;
in optional score mode they are generated control phrases. Nothing is recorded
to disk. The later arm-specific mapping can be revised without changing the score.
*/
(
var p;
if(~pieceV1.notNil) { ~pieceV1[\stop].value };
p = IdentityDictionary.new;
~pieceV1 = p;
p[\duration] = 90.0;
p[\bpm] = 128.0;
p[\masterLevel] = 0.65;
p[\seed] = 1979;
p[\token] = 0;
p[\dancer] = "A";
p[\inputMode] = \osc;
p[\controlGestures] = true;
p[\dropDistance] = 0.22;
p[\dropVelocity] = -1.0;
p[\controlNames] = #[\intensity, \brightness, \pitch, \width, \pan, \density, \space];
p[\definitions] = {
    [
        SynthDef(\macadavlV1Kick, { |out=0, amp=0.2, freq=48, decay=0.32|
            var env = EnvGen.ar(Env.perc(0.001, decay), doneAction: 2);
            var pitch = XLine.ar(freq*3.8, freq, 0.045);
            var click = HPF.ar(WhiteNoise.ar(0.12), 3500)
                * EnvGen.ar(Env.perc(0.0005, 0.012));
            var sig = ((SinOsc.ar(pitch) * env * 2.3) + click).tanh * amp;
            Out.ar(out, sig ! 2);
        }),
        SynthDef(\macadavlV1Hat, { |out=0, amp=0.035, decay=0.06, pan=0|
            var env = EnvGen.ar(Env.perc(0.001, decay), doneAction: 2);
            var sig = HPF.ar(WhiteNoise.ar, 6500) + (BPF.ar(WhiteNoise.ar, 9200, 0.3)*0.4);
            Out.ar(out, Pan2.ar(sig * env * amp, pan));
        }),
        SynthDef(\macadavlV1Bass, { |out=0, amp=0.09, freq=73.416, cutoff=600, dur=0.16, pan=0|
            var env = EnvGen.ar(Env.perc(0.003, dur), doneAction: 2);
            var filterEnv = EnvGen.kr(Env.perc(0.001, dur*0.7));
            var sig = (Saw.ar(freq)*0.5) + (Pulse.ar(freq*0.501, 0.48)*0.3);
            sig = RLPF.ar(sig, (cutoff + (filterEnv*cutoff*2)).clip(70, 9000), 0.23);
            Out.ar(out, Pan2.ar((sig*2).tanh * env * amp, pan));
        }),
        SynthDef(\macadavlV1Accent, { |out=0, amp=0.12, freq=220, variant=0, pan=0, dur=0.18|
            var env = EnvGen.ar(Env.perc(0.001, dur), doneAction: 2);
            var clap = BPF.ar(WhiteNoise.ar, 1700, 0.8)
                * (1 + (SinOsc.ar(85)*EnvGen.ar(Env.perc(0.001, 0.035))));
            var metal = Mix(SinOsc.ar(freq * [1, 1.414, 2.731])) * 0.23;
            var fm = SinOsc.ar(freq + SinOsc.ar(freq*2.07, 0, freq*3*env));
            var stab = RLPF.ar(Mix(Saw.ar(freq * [1, 1.1892, 1.4983]))*0.2,
                800 + (env*6000), 0.4);
            var sig = Select.ar(variant.clip(0, 3), [clap, metal, fm, stab]);
            Out.ar(out, Pan2.ar((sig*1.6).tanh * env * amp, pan));
        }),
        SynthDef(\macadavlV1Drop, { |out=0, amp=0.32|
            var env = EnvGen.ar(Env.perc(0.003, 1.6), doneAction: 2);
            var boom = SinOsc.ar(XLine.ar(110, 36.708, 0.22));
            var air = LPF.ar(PinkNoise.ar, XLine.kr(7500, 180, 0.7)) * 0.25;
            Out.ar(out, ((boom + air)*1.6).tanh * env * amp ! 2);
        }),
        SynthDef(\macadavlV1Pad, { |out=0, rise=0, height=0.5, width=0.5, pan=0|
            var r = Lag.kr(rise, 0.35);
            var chord = [146.832, 174.614, 220.0, 261.626];
            var sig = Splay.ar(Saw.ar(chord * [0.998, 1.002, 1, 0.999]),
                Lag.kr(width, 0.3), 0.17);
            sig = RLPF.ar(sig, 180 + (r.squared*4200) + (Lag.kr(height, 0.3)*250), 0.55);
            sig = Balance2.ar(sig[0], sig[1], Lag.kr(pan, 0.3));
            Out.ar(out, sig * r.squared * 0.42);
        }),
        SynthDef(\macadavlV1Sweep, { |out=0, amp=0.05, pan=0|
            var env=EnvGen.ar(Env([0,1,0],[1.3,0.3],[-2,-4]),doneAction:2);
            var sig=BPF.ar(PinkNoise.ar,XLine.kr(250,7000,1.6),0.4);
            Out.ar(out,Pan2.ar(sig*env*amp,pan));
        }),
        SynthDef(\macadavlV1Master, { |in=0, out=0, level=0.65, space=0.3, duration=90, gate=1|
            var dry = LeakDC.ar(In.ar(in, 2));
            var wet = FreeVerb2.ar(dry[0], dry[1], 1, 0.72, 0.55);
            var sig = dry + (wet * Lag.kr(space.clip(0, 1), 0.4)*0.25);
            var life = EnvGen.ar(Env([0, 1, 1, 0], [0.02, duration-4.02, 4]), doneAction: 2);
            var abort = EnvGen.ar(Env.asr(0.005, 1, 0.15), gate, doneAction: 2);
            sig = Compander.ar(sig, sig, 0.35, 1, 0.4, 0.005, 0.1);
            sig = Limiter.ar((sig*3).tanh * level.clip(0, 1), 0.85, 0.005);
            Out.ar(out, sig * life * abort);
        })
    ]
};

p[\reset] = {
    p[\running] = false;
    p[\lastTick] = 0;
    p[\lastAccent] = 0;
    p[\nextStep] = 0;
    p[\step] = 0;
    p[\eventIndex] = 0;
    p[\dropUntil] = -1;
    p[\freezeUntil] = -1;
    p[\sweepUntil] = -1;
    p[\pendingAccent] = 0;
    p[\received] = 0;
    p[\lastFrameTime] = nil;
    p[\lastAccentTime] = -100;
    p[\lastDropTime] = -100;
    p[\peakPitch] = 0;
    p[\peakTime] = -100;
    p[\dropArmed] = false;
    p[\memory] = Array.newClear(240);
    p[\writeIndex] = 0;
    p[\memoryCount] = 0;
    p[\maxMemory] = 0;
    p[\nextSample] = 0;
    p[\nextCapture] = 18;
    p[\ghosts] = List.new;
    p[\maxGhosts] = 0;
    p[\replayNotes] = 0;
    p[\controls] = (intensity: 0.08, brightness: 0.1, pitch: 0.15,
        width: 0.15, pan: 0.5, density: 0.05, space: 0.15);
    p[\incoming] = p[\controls].copy;
};

p[\curve] = { |now, points|
    var index = 0, a, b;
    while { index < (points.size-2) and: { now >= points[index+1][0] } } { index = index+1 };
    a = points[index]; b = points[index+1];
    now.linlin(a[0], b[0], a[1], b[1]).clip(0, 1)
};
p[\scoreControls] = { |now|
    var rise = p[\curve].value(now, [
        [0,0.06], [8,0.10], [12,0.17], [23.7,0.88], [24,0.48],
        [30,0.34], [36,0.36], [49.7,0.95], [50,0.55], [56,0.42],
        [65,0.72], [69,0.35], [72.8,0.98], [73,0.62], [84,0.96], [86,0.8], [90,0.2]
    ]);
    var progress = (now/90).clip(0,1);
    (
        intensity: rise,
        brightness: (0.09 + (rise*0.73) + (progress*0.12)).clip(0,1),
        pitch: (0.15 + (rise*0.48) + (sin(now*0.19)*0.09)).clip(0,1),
        width: (0.15 + (progress*0.6) + (rise*0.2)).clip(0,1),
        pan: 0.5 + (sin(now*0.17)*progress*0.18),
        density: (0.04 + (progress*0.4) + (rise*0.45)).clip(0,1),
        space: (0.12 + ((1-rise)*0.2) + (progress*0.16)).clip(0,1)
    )
};

p[\events] = [
    [12,\sweep,0.35],
    [18,\accent,0.45], [18.44,\accent,0.55], [18.73,\accent,0.65],
    [21,\hit,0.55], [21.37,\accent,0.65], [21.60,\accent,0.75], [21.79,\accent,0.8],
    [22.5,\sweep,0.8], [24,\release,0.85],
    [32,\accent,0.55], [32.31,\accent,0.7], [32.49,\hit,0.8],
    [38,\sweep,0.6], [43,\hit,0.7], [43.28,\accent,0.75], [43.49,\accent,0.85],
    [46.8,\accent,0.8], [47.03,\accent,0.9], [47.19,\accent,0.7],
    [48,\sweep,1], [50,\release,1],
    [58,\hit,0.7], [58.19,\accent,0.8], [58.47,\accent,0.9], [58.64,\accent,0.75],
    [64,\sweep,0.8], [66.1,\accent,0.75], [66.33,\hit,0.9], [66.51,\accent,1],
    [69,\freeze,0.8], [71.2,\sweep,1], [73,\release,1],
    [77,\hit,0.8], [77.21,\accent,0.9], [77.39,\accent,0.8], [77.57,\accent,1],
    [81,\hit,0.9], [81.17,\accent,0.85], [81.43,\accent,1], [83.2,\sweep,0.7]
];

p[\emit] = { |name, args|
    if(p[\running] and: { p[\group].notNil }) {
        Synth.head(p[\group], name, [\out, p[\bus].index] ++ args);
    };
};
p[\accent] = { |strength=0.6, pan=0, ghost=false|
    var variant = (p[\lastAccent] + [1,2,3].choose) % 4;
    p[\lastAccent] = variant;
    p[\emit].value(\macadavlV1Accent, [\variant, variant,
        \amp, strength.clip(0,1)*if(ghost) { 0.085 } { 0.20 },
        \freq, [50,57,62,65,69,74].choose.midicps,
        \dur, [0.09,0.17,0.25,0.32][variant], \pan, pan.clip(-1,1)]);
};
p[\event] = { |kind, strength=0.7, now=0|
    var pan = (p[\controls][\pan]*2)-1;
    if(p[\running] and: { now<90 } and: { [\hit,\accent,\sweep,\freeze,\release].includes(kind) }
        and: { [\hit,\accent].includes(kind).not or: { (now-p[\lastAccentTime]) >= 0.15 } }
        and: { kind != \release or: { (now-p[\lastDropTime]) >= 3 } }) {
        if([\hit,\accent].includes(kind)) { p[\lastAccentTime]=now };
        switch(kind,
            \hit, {
                p[\emit].value(\macadavlV1Kick, [\amp, strength*0.25]);
                p[\accent].value(strength, pan);
                p[\pendingAccent] = strength;
            },
            \accent, { p[\accent].value(strength, pan); p[\pendingAccent] = strength },
            \sweep, {
                p[\sweepUntil] = now+1.6;
                p[\emit].value(\macadavlV1Sweep, [\amp, strength*0.07, \pan, pan]);
            },
            \freeze, { p[\freezeUntil] = if(p[\inputMode]==\score) { now+2.2 } { inf } },
            \release, {
                p[\lastDropTime]=now;
                p[\freezeUntil] = -1;
                p[\dropUntil] = now+5;
                p[\emit].value(\macadavlV1Drop, [\amp, 0.25+(strength*0.12)]);
                p[\pendingAccent] = strength;
            }
        );
    };
};

p[\receive] = { |values, now|
    var valid=values.size == 7;
    var next, previous=p[\incoming], dt, continuous, energyJump, pitchVelocity;
    valid=valid and: { values.every { |x| x.isNumber and: { x.isNaN.not and: { x.abs < inf } } } };
    if(valid and: { p[\running] } and: { now<90 }) {
        next=IdentityDictionary.new;
        p[\controlNames].do { |key,i| next[key]=values[i].asFloat.clip(0,1) };
        dt=if(p[\lastFrameTime].isNil) { 0 } { now-p[\lastFrameTime] };
        continuous=dt>0.008 and: { dt<0.75 } and: { previous[\intensity]>0.001 }
            and: { next[\intensity]>0.001 };
        if(continuous and: { p[\controlGestures] } and: { p[\inputMode]==\osc }) {
            energyJump=(next[\intensity]-previous[\intensity]).max(next[\brightness]-previous[\brightness]);
            pitchVelocity=(next[\pitch]-previous[\pitch])/dt;
            if(next[\pitch] >= p[\peakPitch] or: { (now-p[\peakTime]) > 0.5 }) {
                p[\peakPitch]=next[\pitch]; p[\peakTime]=now;
            };
            if(p[\dropArmed] and: { next[\intensity]>0.55 }
                and: { pitchVelocity < p[\dropVelocity] }
                and: { (p[\peakPitch]-next[\pitch]) >= p[\dropDistance] }
                and: { (now-p[\peakTime]) <= 0.5 }) {
                p[\event].value(\release,next[\intensity],now);
                p[\dropArmed]=false;
            } {
                if(energyJump>0.07 and: { (energyJump/dt)>1.5 }
                    and: { next[\intensity].max(next[\brightness])>0.55 }) {
                    p[\event].value(\accent,next[\intensity].max(next[\brightness]),now);
                };
            };
        } {
            p[\dropArmed]=false; p[\peakPitch]=next[\pitch]; p[\peakTime]=now;
        };
        if(next[\pitch]>0.65 and: { next[\intensity]>0.001 }) { p[\dropArmed]=true };
        p[\incoming]=next; p[\lastFrameTime]=now; p[\received]=p[\received]+1;
    };
};

p[\listen] = {
    var prefix="/dance/" ++ p[\dancer];
    if(p[\receivers].notNil) { p[\receivers].do(_.free) };
    p[\receivers]=[
        OSCFunc({ |msg| p[\receive].value(msg.drop(1),Main.elapsedTime-p[\began]) },prefix++"/params"),
        OSCFunc({ |msg|
            if(msg.size==3 and: { msg[1].isString or: { msg[1].isKindOf(Symbol) } }
                and: { msg[2].isNumber } and: { msg[2].isNaN.not } and: { msg[2].abs<inf }
                and: { p[\inputMode]==\osc }) {
                p[\event].value(msg[1].asSymbol,msg[2].clip(0,1),Main.elapsedTime-p[\began]);
            };
        },prefix++"/event"),
        OSCFunc({ |msg| if(msg.size==1) { p[\stop].value } },prefix++"/stop")
    ];
};

p[\capture] = { |now|
    var capacity = if(now < 42) { 1 } { if(now < 66) { 2 } { 3 } };
    var count = [50,67,83,100].choose.min(p[\memoryCount]);
    var data;
    if(count >= 50) {
        data = Array.fill(count, { |i| p[\memory].wrapAt(p[\writeIndex]-count+i).copy });
        if(p[\ghosts].size >= capacity) { p[\ghosts].removeAt(0) };
        p[\ghosts].add((data: data, phase: 0, previous: -1, nextNote: now,
            rate: [0.83,1.17,1.43].choose, pan: [-0.65,0.6,-0.2].choose));
        p[\maxGhosts] = p[\maxGhosts].max(p[\ghosts].size);
    };
};

p[\tick] = { |now|
    var dt = (now-p[\lastTick]).clip(0,0.1);
    var progress = (now/90).clip(0,1);
    var fracture = ((now-12)/70).clip(0,1);
    var c, target, fresh, live, remembered, ghostMix = Array.fill(8,0), step, beat, dropped, frozen;
    p[\lastTick] = now;
    if(p[\running]) {
        if(now >= 90) {
            p[\master] = nil;
            p[\stop].value;
            "PieceV1: 90 seconds complete.".postln;
        } {
            if(p[\inputMode]==\score) {
                c=p[\scoreControls].value(now);
            } {
                fresh=p[\lastFrameTime].notNil and: { (now-p[\lastFrameTime])<0.75 };
                target=if(fresh) { p[\incoming] } {
                    (intensity:0.04,brightness:0.1,pitch:0.15,width:0.2,pan:0.5,density:0,space:0.3)
                };
                c=IdentityDictionary.new;
                p[\controlNames].do { |key|
                    c[key]=p[\controls][key]+((target[key]-p[\controls][key])*(1-exp(dt.neg/0.35)));
                };
            };
            p[\controls] = c;
            while { p[\inputMode]==\score and: { p[\eventIndex] < p[\events].size }
                and: { now >= p[\events][p[\eventIndex]][0] } } {
                var event = p[\events][p[\eventIndex]];
                p[\event].value(event[1],event[2],now);
                p[\eventIndex] = p[\eventIndex]+1;
            };
            dropped = now < p[\dropUntil];
            frozen = now < p[\freezeUntil];
            if(frozen) { c[\intensity]=c[\intensity]*0.25; c[\brightness]=0.07; c[\space]=0.95 };
            if(now < p[\sweepUntil]) { c[\brightness]=(c[\brightness]+0.18).min(1) };
            live = p[\controlNames].collect { |key| c[key] };
            live = live.add(p[\pendingAccent]);
            p[\ghosts].do { |g|
                var index=g[\phase].floor.asInteger % g[\data].size;
                var f=g[\data][index];
                var pan=(g[\pan]+((f[4]*2-1)*0.3)).clip(-1,1);
                ghostMix=ghostMix+f;
                if(index != g[\previous]) {
                    if(f[7]>0.08 and: { frozen.not }) {
                        p[\accent].value(f[7]*0.6,pan,true);
                        p[\replayNotes]=p[\replayNotes]+1;
                    };
                    g[\previous]=index;
                };
                if(now >= g[\nextNote]) {
                    if(frozen.not) {
                        p[\emit].value(\macadavlV1Bass, [\amp, 0.025+(f[0]*0.055),
                            \freq, ([38,41,45,48,50].wrapAt((f[2]*9).floor.asInteger)+12).midicps,
                            \cutoff, 250+(f[1]*3500), \dur, 0.09+(f[3]*0.18), \pan, pan]);
                        p[\replayNotes]=p[\replayNotes]+1;
                    };
                    g[\nextNote]=now+((0.17+((1-f[5])*0.45))/g[\rate]);
                };
                g[\phase]=(g[\phase]+(dt*20*g[\rate])) % g[\data].size;
            };
            if(p[\ghosts].notEmpty) { ghostMix=ghostMix/p[\ghosts].size };
            if(now >= p[\nextSample]) {
                remembered=if(p[\ghosts].isEmpty) { live } {
                    (live*(1-(progress*0.28))) + (ghostMix*(progress*0.28))
                };
                if(p[\inputMode]==\score or: { fresh }) {
                    p[\memory][p[\writeIndex]]=remembered.copy;
                    p[\writeIndex]=(p[\writeIndex]+1)%240;
                    p[\memoryCount]=(p[\memoryCount]+1).min(240);
                    p[\maxMemory]=p[\maxMemory].max(p[\memoryCount]);
                };
                p[\pendingAccent]=0;
                p[\nextSample]=(p[\nextSample]+0.05).max(now);
                if(p[\pad].notNil) {
                    p[\pad].set(\rise,c[\intensity],\height,c[\pitch],\width,c[\width],\pan,c[\pan]*2-1);
                };
                if(p[\master].notNil) { p[\master].set(\space,c[\space]) };
            };
            if(now >= p[\nextCapture] and: { now<86 }) {
                p[\capture].value(now); p[\nextCapture]=now+6;
            };
            if(now >= p[\nextStep]) {
                step=p[\step]; beat=60/p[\bpm];
                if(frozen.not) {
                    if(((step%4)==0 and: { (1-(fracture*0.5)).coin })
                        or: { fracture>0.3 and: { (fracture*0.12).coin } }) {
                        p[\emit].value(\macadavlV1Kick, [\amp,
                            if(dropped) { 0.34 } { 0.05+(c[\intensity]*0.20) }]);
                    };
                    if((step%4)==2 or: { (fracture*0.38).coin }) {
                        p[\emit].value(\macadavlV1Hat, [\amp,0.018+(c[\intensity]*0.045),
                            \decay,if((step%8)==6) { 0.13 } { 0.04 }, \pan,0.35.rand2*c[\width]]);
                    };
                    if(now>=8 and: { (if(dropped) { 0.9 } { c[\density]*0.8 }).coin }) {
                        p[\emit].value(\macadavlV1Bass, [\amp,if(dropped) { 0.20 } { 0.04+(c[\intensity]*0.13) },
                            \freq,([38,38,45,38,41,48,38,50].wrapAt(step)
                                + if(c[\pitch]>0.65 and: { dropped.not }) { 12 } { 0 }).midicps,
                            \cutoff,180+(c[\brightness]*3700), \dur,if(dropped) { 0.23 } { 0.12 },
                            \pan,(c[\pan]*2-1)*0.3]);
                    };
                };
                p[\step]=step+1;
                p[\nextStep]=(p[\nextStep]+((beat/4)*(1+(fracture*0.65.rand2))).max(0.035)).max(now);
            };
        };
    };
};

p[\stop] = {
    var group=p[\group], bus=p[\bus];
    p[\token]=p[\token]+1;
    p[\running]=false; p[\starting]=false;
    if(p[\routine].notNil) { p[\routine].stop; p[\routine]=nil };
    if(p[\receivers].notNil) { p[\receivers].do(_.free); p[\receivers]=nil };
    if(p[\master].notNil) { p[\master].set(\gate,0) };
    if(group.notNil) { SystemClock.sched(0.25,{ group.free; bus.free; nil }) };
    p[\group]=nil; p[\bus]=nil; p[\pad]=nil; p[\master]=nil;
    p[\ghosts]=List.new; p[\memory]=Array.newClear(240); p[\memoryCount]=0;
    CmdPeriod.remove(p[\panic]);
};
p[\panic] = { p[\stop].value };
p[\start] = {
    var token, server=Server.default;
    p[\stop].value; p[\reset].value;
    p[\starting]=true; token=p[\token];
    CmdPeriod.add(p[\panic]);
    server.waitForBoot({
        if(token == p[\token]) {
            p[\definitions].value.do { |definition| definition.send(server) };
            server.sync;
            if(token == p[\token]) {
                p[\bus]=Bus.audio(server,2);
                p[\group]=Group.head(server);
                p[\pad]=Synth.head(p[\group],\macadavlV1Pad,[\out,p[\bus].index]);
                p[\master]=Synth.tail(p[\group],\macadavlV1Master,
                    [\in,p[\bus].index,\level,p[\masterLevel],\duration,90]);
                p[\began]=Main.elapsedTime;
                p[\running]=true; p[\starting]=false;
                p[\listen].value;
                p[\routine]=Routine({
                    thisThread.randSeed=p[\seed];
                    while { p[\running] } {
                        p[\tick].value(Main.elapsedTime-p[\began]); 0.01.wait;
                    };
                }).play(SystemClock);
                ("PieceV1: START / 90 seconds / " ++ p[\inputMode] ++ " / /dance/" ++ p[\dancer]
                    ++ " / UDP " ++ NetAddr.langPort).postln;
            };
        };
    });
};
p[\status] = {
    (running:p[\running], seconds:p[\lastTick].round(0.1),
        mode:p[\inputMode], frames:p[\received], controls:p[\controls], memoryVoices:p[\ghosts].size,
        replayNotes:p[\replayNotes]).postln;
};
p[\reset].value;
"PieceV1 ready. Evaluate ~pieceV1[\\start].value; — listens to seven OSC controls.".postln;
)
