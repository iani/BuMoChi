# Controlling avatars from a camera

## Standard local configuration

BuMoChi exercises use the following default assignment:

| Role | Avatar or application | Port |
|---|---|---:|
| Local camera source | XR-Animator or another VMC mocap application | sends to `39537` |
| Camera identity at encoder startup | Ishidomaru | `--avatar Ishidomaru` |
| Bmc input | SuperCollider | `57130` |
| Bmc routed-frame output | BunrakuOSCDecoder | `39538` |
| Default Godot camera-controlled avatar | Ishidomaru | `39539` |
| Second Godot avatar | Mother | `39540` |

Thus XR-Animator and other local mocap applications control Ishidomaru by default. `Seed_2_Ishidomaru_C` and `Seed_4_Mother_Ishidomaru_E` use `39539` for Ishidomaru. The two-avatar project uses `39540` for Mother.

Start the standard local pipeline with:

```bash
./start_bumochi_pipeline.sh
```

This is equivalent to selecting `--avatar Ishidomaru`. XR-Animator should send VMC to `127.0.0.1:39537`. The encoder's `--avatar` option labels the incoming motion; it does not select a Godot UDP port.

Configure the Bmc destinations as follows:

```supercollider
(
~ishidomaru = Bmc.avatar(\Ishidomaru);
~ishidomaru.vmcPort_(39539);

~mother = Bmc.avatar(\Mother);
if(~mother.isNil) {
    ~mother = Bmc.addAvatar(\Mother, "Mother");
};
~mother.vmcPort_(39540);
)
```

The decoder accepts all valid embedded target ports. It does not need to be restarted when Bmc changes a source's target avatar.

## Identity, source, target avatar, and port

Four values have distinct jobs:

1. **Encoder avatar** identifies the figure named in the incoming route-free frame. The launcher default is Ishidomaru.
2. **Source** identifies the motion-producing stream, for example `192-xr-animator`. It remains stable when that stream is routed to another avatar.
3. **Bmc target avatar** owns the cache and composition stack currently receiving the source.
4. **`BmcAvatar.vmcPort`** is embedded in the completed version-2 or version-4 routed frame and selects the final Godot VMC receiver.

The runtime router changes items 3 and 4 without changing the encoder process:

```text
XR-Animator
    -> VMC UDP 39537
BunrakuOSCEncoder
    -> route-free frame, avatar Ishidomaru, stable source name
    -> UDP 57130
BmcDispatcher source router
    -> selected BmcAvatar
Bmc compositor
    -> version-2/4 frame containing selectedAvatar.vmcPort
    -> UDP 39538
BunrakuOSCDecoder
    -> embedded target port
Godot avatar
```

Routing occurs before ordinary avatar dispatch. A routed camera frame is consumed by its selected target and is not also delivered to the encoder-labelled avatar. This prevents one camera stream from moving two avatars accidentally.

## Switch the camera target without restarting the pipeline

Allow at least one camera frame to reach Bmc after startup. Bmc remembers the latest source associated with the default encoder avatar, Ishidomaru. Then evaluate:

```supercollider
Bmc.cameraTarget_(\Mother);
```

The operation:

1. identifies the current camera source;
2. removes that source's cache from its previous avatar;
3. installs a source-specific route to Mother;
4. sends subsequent frames only to Mother's compositor;
5. emits completed Mother frames with target port `39540`.

The encoder, decoder, OSCGroups client, XR-Animator, and Godot keep running.

Switch back with:

```supercollider
Bmc.cameraTarget_(\Ishidomaru);
```

The next camera frame recreates the cache on Ishidomaru and is emitted to `39539`.

Inspect the current camera settings with:

```supercollider
Bmc.cameraSource;
Bmc.cameraTarget;
Bmc.motionSourceRoutes;
Bmc.status;
```

## Select the camera source explicitly

Automatic camera-source discovery uses the most recently received source whose incoming avatar is Ishidomaru. This is convenient for a local single-camera setup. In a collaborative session, several sources might carry the same avatar identity, so select the local source explicitly.

Find the encoder's source name in its startup command or verbose log. For example:

```text
--source 192-xr-animator
```

Then evaluate:

```supercollider
Bmc.cameraSource_('192-xr-animator');
Bmc.cameraTarget_(\Mother);
```

`cameraSource_` establishes a stable, exact source match. Changing the camera target does not affect other local or remote motion sources.

If `cameraTarget_` is called before Bmc has received a discoverable camera frame and before `cameraSource_` has been set, it reports an error instead of guessing.

## General motion-source routing

The camera methods are conveniences over the general source router. Any incoming source can be assigned at runtime:

```supercollider
Bmc.routeMotionSource('192-xr-animator', \Mother);
Bmc.routeMotionSource(\waidayo, \Ishidomaru);
```

Routes are source-specific. Retargeting a source removes its old compositor cache before installing the new route:

```supercollider
Bmc.routeMotionSource('192-xr-animator', \Ishidomaru);
```

Remove an explicit route with:

```supercollider
Bmc.removeMotionSourceRoute('192-xr-animator');
```

This also removes the source's routed cache. Subsequent frames again follow ordinary avatar-name dispatch—the avatar identity placed in the frame by the encoder.

## Camera on Ishidomaru and a clip on Mother

With `Seed_4_Mother_Ishidomaru_E` running and the standard ports configured:

```supercollider
Bmc.cameraTarget_(\Ishidomaru);

Bmc.play(
    \zoom_test,
    loop: true,
    playerName: \motherZoom,
    avatarName: \Mother
);
```

The result is:

```text
camera source -> Ishidomaru compositor -> Godot UDP 39539
zoom_test     -> Mother compositor      -> Godot UDP 39540
```

Stop only the clip with:

```supercollider
Bmc.stopPlayback(\motherZoom);
```

## Camera on Mother while a clip controls Ishidomaru

No Python restart is required:

```supercollider
Bmc.cameraTarget_(\Mother);

Bmc.play(
    \zoom_test,
    loop: true,
    playerName: \ishidomaruZoom,
    avatarName: \Ishidomaru
);
```

The result is:

```text
camera source -> Mother compositor      -> Godot UDP 39540
zoom_test     -> Ishidomaru compositor  -> Godot UDP 39539
```

## Composition still applies after routing

Runtime routing selects the avatar that receives a source; it does not bypass composition. After the camera reaches its target, its cache participates in that avatar's normal newest-first composition stack. Clip players, other live streams, and future transformative rules can still override or modify it.

For example, if a full-body clip overwrites Mother after the camera has been routed to Mother, the clip remains visible because it is newer. Stopping that player removes its cache and reveals the current camera pose underneath. Muting it removes its cache while its playback clock continues.

## Troubleshooting

If the selected avatar remains still:

1. Confirm XR-Animator sends to `127.0.0.1:39537`.
2. Confirm the encoder's received and sent counters increase.
3. Evaluate `Bmc.status` and confirm `received` increases.
4. Inspect `Bmc.cameraSource`, `Bmc.cameraTarget`, and `Bmc.motionSourceRoutes`.
5. Confirm the target avatar exists with `Bmc.avatar(name)`.
6. Confirm its `vmcPort` matches the corresponding Godot tracker.
7. Confirm the Godot project uses Ishidomaru `39539` and Mother `39540`.
8. Confirm a newer full-body clip cache is not intentionally overwriting the camera.

If automatic discovery selected the wrong collaborator's source, set the exact local encoder source with `Bmc.cameraSource_(sourceName)` and retarget again.
