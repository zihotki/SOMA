# Instructions for the coding agent (managed by the app, do not edit)

You are helping a person design a 3D model with code. The model is written in Python with CadQuery.
Open the model in CAD Lab Viewer. Read `NOTES.md` for the project notes. The app manages these instructions.

## Project layout

| Path | Purpose |
|---|---|
| `model.py` | Entry point. Builds the model and registers every part. Small models live only here |
| `parts/` | Optional. Move parts into modules here when `model.py` gets long, import them from `model.py` |
| `inputs/` | Files the user brought (STEP, images, PDF). Never modify them, load them from `model.py`. Read PDFs with `pdfplumber` (text, lines and coordinates, `page.to_image()` for a picture) |
| `parameters.json` | Values the user set in the app's Parameters panel (rule 7). Written by the app |
| `output/model.step` | Main result with all parts, written by `soma build`. Never write it yourself |
| `exports/` | Single-part exports written by `soma export` |
| `animations/` | Optional. Motion, camera flights and captions in Python (`soma.anim`), one file per topic. The skill for animation explains them |
| `analyses/` | Optional. Load cases for `soma analyze fem` in Python (`soma.fem`), one file per load case. The skill for FEM explains them |
| `drawings/` | Optional. Technical drawings in Python (`soma.drawing`), one file per drawing or set of sheets. `soma drawing build` writes PDF and DXF to `output/drawings/`, all sheets together to `output/drawings.pdf`. The skill for technical drawings explains them |
| `renders/` | Pictures and videos written by `soma render`. Not in the version history and not in the saved .soma file |
| `.soma/` | App data (viewer cache, build status, feedback images, skills, built animations, analysis results, drawing pictures). Do not edit. Use the skill sources listed below and open files in `.soma/feedback/` when the user points you to them |

## Rules for model.py

1. `from soma import add_part, param, import_step, import_assembly`
2. **Register every part**: `add_part("Name", workplane_or_shape)`. Unregistered geometry is invisible in the viewer and missing from exports.
3. Names are unique. Umlauts are fine, they are shown as written.
4. Group related parts with `group`: `add_part("Screw front", screw, group="Housing/Screws")` (nested with `/`). Groups show up in the part tree of the app and as sub-assemblies in `output/model.step`.
5. Mark a part the user brought (for example a circuit board) with `role="reference"`: it is shown semi-transparent and skipped by `soma export --all`. Cut clearances around it, but do not export it. Scenery for an animation or a video (a floor, a stand, a logo) is a reference too: give it `alpha=1` and a `color` to make it opaque.
6. Units are millimetres, Z is up, the front faces −Y (the front view looks from −Y), X points right. Put dimensions in named constants at the top of `model.py` so the user can ask for changes ("make the wall 3 mm"). Once parts live in `parts/`, the constants go to `parts/params.py`, and `model.py` and the part modules import them from there.
7. **Parameters for the user**: make the values the user would want to change themselves with `param()`: `BORE = param(38.0, "Cylinder bore", min=30, max=42, step=0.5, unit="mm", group="Crank train")`. They appear in the app's Parameters panel, where the user changes them without you. Good parameters are main dimensions, counts, options and positions (`CRANK = param(0, "Crank angle", min=0, max=360, unit="deg")`), usually 3 to 15 per model. Helper and derived values stay plain constants. Choose `min` and `max` so that the model builds and makes sense over the whole range. The default decides the field: `param(18, ...)` whole numbers, `param(True, ...)` a switch, `param("M3", ..., options=["M3", "M4"])` a choice. The user's values are kept in `parameters.json` and take the place of the defaults in the code, `soma build` lists them ("set by the user in the app"). So the number in the code is not always the one in the model. Do not edit `parameters.json` unless the user asks. If the user asks you for a new value of a parameter they set in the panel, change the default in the code and remove its entry from `parameters.json`, so that the code's value applies again.
8. Load user files with `import_step("inputs/board.step")`: this merges the whole file into one shape. If the file has several parts or sub-assemblies, keep them with `asm = import_assembly("inputs/board.step")` and `add_part("Board", asm, role="reference")`: every body becomes its own part with its name and color, the sub-assemblies become groups under "Board". Move an assembly with `asm.loc = cq.Location((x, y, z))`. STEP files often have their origin in a corner: check the bounding box and move the part deliberately.
9. Prefer simple, readable CadQuery. Check that operations produced solids. Do not use `show_object` or `cq_editor`.

## Commands

Run these commands from the project folder. Open the viewer on this project to make a still render.

| Command | Purpose |
|---|---|
| `soma build` | Runs `model.py`, writes `output/model.step` and the viewer cache. **Run it after every change and read the result.** On errors it prints the file, line and message |
| `soma export <Part> --format stl --detail fine` | Exports one part (formats: step, stl, 3mf, amf, brep, iges, obj, vrml, glb, gltf, dxf, svg) |
| `soma export --all --format step` | Exports all parts except references |
| `soma export <Part> --format glb --detail coarse` | Mesh formats (stl, 3mf, amf, obj, glb, gltf) take `--units mm\|cm\|m\|in`, `--up z\|y`, `--detail coarse\|normal\|fine` or `--tolerance <mm>`. Default: glb/gltf in m with Y up (game engines, Blender), the others in mm with Z up |
| `soma render` | Saves a picture of the current model to `renders/view-iso.png` (`--view top` or a direction `--view=1,-2,1`, `--hide`/`--only` parts or groups, `--fit` parts, `--zoom 2`, `--size 1280x800`, `--out`). **Open the picture and look at it** to check your work, also inside: hide what is in the way. Needs the app with this model open, it renders with the app's viewer |
| `soma analyze overhang` (or `thickness`, `clearance`) | Value at every spot of the surface with a summary per part. Details in the skill for analysis |
| `soma analyze fem analyses/x.py` | Stresses, safety and deflection under a load case described in `analyses/x.py`. Details in the skill for FEM |
| `soma anim build`, `soma anim info "Name"` | Animations from `animations/`. Details in the skill for animation |
| `soma drawing build`, `soma drawing info "Name"` | Technical drawings from `drawings/` as PDF, DXF and a picture to check. Details in the skill for technical drawings |

If `soma build` fails, fix the error before doing anything else. Keep the model buildable at all times.

## Version history (git)

The viewer shows Git commits below the 3D view.

- After every meaningful iteration that **builds successfully** (`soma build` says "Build ok"), commit it: `git add -A`, then `git commit -m "<short description>"`. Write the message in the language the user speaks. Build first, so `output/model.step` in the commit matches the code.
- Do not rewrite history: no `git reset`, `rebase`, `commit --amend` or `push --force`, no new branches, no `checkout` or `switch` to old commits. To go back to an earlier version, tell the user to open it in the timeline of the app and click "Restore".
- Do not delete or re-create `.git` and do not remove `.gitignore`.

## Environment

Use the CAD Lab wrapper for projects in CAD Lab. For a direct call, use the project's Python in `.soma/env` with `-m soma` or `-m pip`. A build records extra packages in `requirements.txt`. The viewer can initialize the project environment when it opens the folder.

## Feedback from the user

Read all pending comments with `soma review list` when the user says they reviewed the model. The project log is `.soma/feedback/review.jsonl`. Each comment has an ID and a reference to the selected part, face, drawing item or other viewer context. References from an earlier build can require comparison with the current model. Open any PNG referenced by a markup comment.

After you address and verify a comment, record it by ID with `soma review address <id>`. Leave other comments pending. Keep the earlier notes in the log.

<!-- soma:skills -->
## Skills

No skills are switched on for this model. The user can switch on rule sets (for example 3D printing) in the app.
<!-- /soma:skills -->
