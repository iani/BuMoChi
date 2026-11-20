# 04 SuperCollider Survival Guide

SuperCollider is a programming language for sound, and the place where you control BuMoChi. You do not need to learn the language for this workshop. You need five things.

## 1. Running a line

Click on a line so that the cursor is in it, then press:

- **Cmd-Return** on macOS
- **Ctrl-Return** on Linux and Windows

Nothing needs to be selected. Try it:

```supercollider
"hello".postln;
```

## 2. Running a block

Code inside a pair of parentheses that start and end on their own lines is one block. Put the cursor anywhere inside it and press the same keys; the whole block runs.

```supercollider
(
"first line".postln;
"second line".postln;
)
```

In the workshop file `BuMoChi_Workshop.scd`, run one line or one block at a time, from top to bottom. Never select the whole file and run it.

## 3. The Post window

Everything SuperCollider wants to tell you appears in the Post window. After each line you run, glance at it.

- Ordinary output follows `->`.
- A line starting with `ERROR:` means the line did not work. Read the first line of the error; it usually names the problem. The long list underneath can be ignored.
- The most common errors are typing mistakes: a missing `;`, a missing `)`, or a wrong capital letter. `Bmc` is not `bmc`.

## 4. Stopping everything

**Cmd-Period** (macOS) or **Ctrl-Period** (Linux, Windows) stops all sound and all clip playback immediately. Use it whenever something is too loud or you are lost.

## 5. Starting again

If SuperCollider behaves strangely, choose **Language → Recompile Class Library**. This restarts the language and BuMoChi with them. Clips you recorded were saved to disk when you stopped recording, so they are still available by name afterwards. Clips you made by combining others are lost unless you saved them (chapter 06).

## Small pieces of syntax you will see

| You see | It means |
|---|---|
| `\take1` | A name (a "symbol"). Names for clips, bones, and avatars are written with a backslash |
| `"Ishidomaru"` | Text (a "string") |
| `~sound` | A variable you can use again in later lines |
| `Bmc.play(\take1);` | Ask `Bmc` to do `play` with `\take1` |
| `Bmc.play(\take1, loop: true);` | The same, with a named option |
| `[110, 880]` | A list of two numbers |
| `// note` | A comment: ignored by SuperCollider |
| `;` | The end of a statement |

## Sound

Movement work needs no sound. For chapter 07 you will start the sound engine with:

```supercollider
s.boot;
```

Wait for the numbers at the bottom right of the SuperCollider window to turn green.

Keep your volume low at first. Synthesized sound can be much louder than you expect.

Next: [05 Record and Play Back Movement](05%20Record%20and%20Play%20Back%20Movement.md)
