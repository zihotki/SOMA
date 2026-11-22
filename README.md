# CAD Lab Viewer

CAD Lab Viewer opens CadQuery models and drawings from project folders. It rebuilds when the source files change. Inspect parts, measure features, make sections, and add review comments tied to the model or drawings.

The desktop viewer and the compatible `soma` command-line tool share this repository. CAD Lab projects use the checkout through the CAD Lab wrapper.

## Use the viewer

1. Open the project folder in CAD Lab Viewer.
2. Edit the project's Python source in your workspace. Use **Parameters** for values that the source exposes for adjustment.
3. Select a part, face, drawing view or dimension and choose **Add comment**. Use **Review** to see pending comments.
4. Use **Drawings** to inspect the generated sheets and export PDF or DXF. Use **Export** for model formats such as STEP, STL and 3MF.

Review comments are stored in `.soma/feedback/review.jsonl`. Build, drawing and export commands can run with the viewer closed. Still renders use the local connection to the viewer for the selected project.

See [app setup](app/README.md) for source launch and checks.

## Folder setup

The headless initializer needs an existing profile folder and a Python entry script inside the project. It reports its changes as JSON and backs up existing instructions before changing them. Repeat runs are safe. `SOMA_USER_DATA` can supply the profile in place of `--profile`.

```sh
cd app
npm ci
npx install-electron
npm run build
node dist/main/init.js init "/path/to/project" --entry model.py --profile "/path/to/profile"
SOMA_USER_DATA="/path/to/profile" node scripts/start.mjs --open-folder "/path/to/project"
```

## License

CAD Lab Viewer is a fork of [SOMA](https://github.com/Kai-Jungsthoefel/SOMA) by Kai Jungsthöfel. The software is licensed under [GNU GPL version 3 or later](LICENSE). The [SOMA Model Exception](MODEL-EXCEPTION.md) covers model files that import `soma`. The GPL does not apply to STEP or STL exports. The CadQuery script exporter includes compatibility code that is also available under the Apache License 2.0.
