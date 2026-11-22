---
title: Shell environment
name: Shell environment
summary: Run soma and pip through the model environment in an external shell.
order: 8
category: Way of working
default: on-demand
when: `soma` or `pip` is unavailable, or files appear with incorrect characters in PowerShell
topics: Running soma; Installing packages; Reading files in Windows PowerShell
---
# Skill: Shell environment

## Running soma

Open a shell in the project folder. In CAD Lab, use `cadlab soma` with the project path. To call the project's Python directly, run:

- On Windows, `.soma\env\Scripts\python.exe -m soma build`.
- On macOS and Linux, `.soma/env/bin/python -m soma build`.

Use the same Python for other `soma` commands. If the project environment is missing, open the model in CAD Lab Viewer to initialize it. Build and export can run with the viewer closed. A still image from `soma render` requires CAD Lab Viewer on the selected project. Use the CAD Lab wrapper to select the viewer profile.

## Installing packages

Use the project's Python with `-m pip install <package>`. A build records the required extra packages in the project's requirements file.

## Reading files in Windows PowerShell

Windows PowerShell 5.1 can read UTF-8 files as ANSI. Use `Get-Content -Encoding UTF8 <file>`. Use a UTF-8 editor to write the file.
