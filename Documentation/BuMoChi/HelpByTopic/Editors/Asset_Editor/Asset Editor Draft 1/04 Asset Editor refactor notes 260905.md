2026-09-05

Move the following buttons to the line starting with "Refresh projects"
- Add selected Preset to Scene" (rename to "Add to Scene" to save space!)
- Play Preset (rename to "Play")
- Stop Preset (rename to "Stop")

The message static text "Seleced Preset is not added to Scene" should be removed.  We may add something to that effect, after testing its necessity and what it does during testing.

Now The space to the right of Existing Presets list is empty.  In it place, add a third list, "Body parts controlled" dividing the horizontal space equally between the three lists.
Existing Clips - Existing Presets - Body parts controlled.

The list "Body parts controlled" should allow multiple item selection. It will be used to specify which parts of the body of the avatar the preset should control.
There should be a button "Select all" and a button "Unselect all" to conrol the selection of the Body parts controlled list. Perhaps put these in lines below ehe header, making the list window for Body parts controlled a little less in height to allow space for the extra lines.


Also please explain to me what the button "Confirm target name" does.

## Implementation note

Implemented on 2026-09-05. The selected Preset's body selection is loaded into the new multi-selection list. **Select all** and **Unselect all** provide fast starting states. **Add to Scene** then creates a Scene-specific, in-memory copy of the Preset with the chosen body parts and target; it does not modify the saved source Preset.

**Confirm target name** associates the editable BuMoChi target name with the avatar node found by the Godot inspector in the selected project and Scene. Preset playback can consequently address a meaningful name instead of using a VMC port as identity. Editing and confirming this field does not rename the node in Godot. In the current prototype, this mapping lasts while the Asset Editor is open; persistent Scene storage will retain it later.
