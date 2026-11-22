# CAD Lab Viewer desktop app

Use the development checkout to run the Electron viewer. The CAD Lab wrapper sets the project folder, Python executable and profile. To run directly, install Node.js 22.12 or later and provision the Python environment from `python/requirements-base.txt` with the `soma` package installed from `python/`.

```sh
npm ci
npx install-electron
SOMA_PYTHON=/path/to/venv/bin/python npm start -- --open-folder "/path/to/project"
```

On Windows, `python/scripts/setup_env.ps1` creates the development environment in `%LOCALAPPDATA%\soma-dev\venv`. For a direct launch with a project profile, set `SOMA_USER_DATA` to its profile directory. The app publishes the local still-render connection in that directory.

## Checks

```sh
npm run typecheck
npm run test:unit
npm test
```

Set `SOMA_PYTHON` to the provisioned interpreter when you run the Electron test suites. To run selected suites, build first and run, for example:

```sh
npm run build
node test/run-all.mjs folder params measure section drawing drawview review meshexport
```

Use `npm run test:all` to include the slower animation and FEM suites. The runner gives each suite an isolated profile and a debug port. Set `SOMA_TEST_JOBS=1` to run them serially.

## Source

- `src/main/` opens projects, watches files, runs builds and serves the authenticated local render bridge.
- `src/preload/` exposes the desktop APIs to the renderer.
- `src/renderer/` contains the viewer, drawing inspection, tools and review interface.
- `src/cli/init.ts` is the headless folder initializer.
- `resources/skills/soma-app.md` supplies the in-app help.
