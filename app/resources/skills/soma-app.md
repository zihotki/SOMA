---
title: Using the app
name: Using the app
summary: The CAD Lab Viewer guide for opening projects, inspecting models and drawings, and saving review comments.
order: 9
category: Way of working
default: on-demand
when: the user asks how to use CAD Lab Viewer or where to find a tool
topics: The window; Start page; Viewer; Tools; Review; Sidebar; Drawings; Files and code; Saving and history; Export; Settings
---
# CAD Lab Viewer

<!-- agent -->
> **For the agent:** use this guide to answer questions about CAD Lab Viewer. When the user has completed a review, read the project's pending comments with `soma review list`. Open any markup images that the comments reference.
<!-- /agent -->

## The window

- **Model menu** opens or creates a model or project folder.
- **Build status** shows when a build is running, complete or failed. Click it to change auto build or run a build. A failed build shows its error and source line in the viewer.
- **Columns** shows or hides the sidebar (Ctrl 1) or code (Ctrl 2).
- **Import** copies files such as STEP models, images and sketches into `inputs/`. You can also drag files into the window.
- **Export** writes parts in a selected format.
- **Help** opens this guide (F1). **Settings** controls the viewer, shortcuts, skills and storage.

## Start page

Use **Open** for a `.soma` archive or **Open folder** for a project directory. **New model** starts from an example. The arrow next to it also offers **From CadQuery script** and **Open folder**. The recent list gives access to previous projects.

## Viewer

Rotate, pan and zoom with the mouse. Change the mouse preset under **Settings → Viewer**. Click an orientation on the view cube. Double-click the model to set a pivot at the pointer.

Select a part from the model or the structure tree. Ctrl-click adds or removes a part from the selection. Right-click to isolate, hide, zoom to or show the code for a part. Click **Add comment** in the selection card to record the selected part or face.

## Tools

- **Measure** gives the exact dimensions of a face or edge. Click a second feature to measure the distance or angle between them.
- **Section** shows a cut through the model. Select an axis or the plane of a face and move the section plane.
- **Explode** separates the assembly parts. You can play the disassembly in steps.
- **Mark up** captures the viewer and shows tools to draw arrows, shapes and text. **Add comment** saves the PNG in `.soma/feedback/` and opens a comment that references it.

## Review

Select a part, face or drawing item and click **Add comment**. Enter your note and select **Save comment**. Comments record the selection and its build ID when available.

Click **Review** in the viewer toolbar to see pending comments for this project. They remain available after you quit. The log is in `.soma/feedback/review.jsonl`.

## Sidebar

![Sidebar controls](../help/sidebar.png)

1. **Parameters** changes adjustable dimensions, counts and angles. Changes rebuild the model. The reset button restores the value from the source code.
2. **Files** shows source files, inputs and outputs.
3. **Analysis** shows analysis results.
4. **Animation** plays model animations and videos.
5. **Drawings** opens the current drawing sheets.
6. **Skills** selects the rules for the project.
7. **Help** opens this guide.
8. **Settings** opens the app settings.

## Drawings

Run `soma drawing build` after editing the drawing sources. Use **Drawings** in the sidebar to open the generated sheets. The sheet controls open its source or DXF, export PDF or DXF, and rebuild the sheet.

Click a view, planar section or dimension to show it on the 3D model. **Add comment** records the sheet and the selected item, its source location, and the measured value for a dimension.

## Files and code

Open a text file in **Files** to see its contents. Ctrl S saves changes and runs a build. When an external edit conflicts with a change in the editor, review the conflict before saving.

Click an image to open it for markup. Select text in a PDF and click **Add comment** to include the text, file and page. Open a STEP file to inspect it in the viewer.

## Saving and history

For a folder project, save files in the folder and manage changes with Git. When the folder has Git history, the timeline lets you view earlier versions. For an archive model, **Save** makes a history snapshot and writes the `.soma` archive.

## Export

In **Export**, choose all parts or the current selection, then select a format. Use STEP for CAD exchange. Use **Detail → Fine** for high-detail mesh exports such as STL and 3MF. The **Drawings** controls export PDF and DXF separately from the model.

## Settings

In **Viewer**, change navigation, projection, display defaults and measurement precision. **Shortcuts** lists the current controls. **Skills** manages the libraries, **Storage** shows the app folders, and **About** gives versions and system information.
