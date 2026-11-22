# Security

## Reporting a vulnerability

Please do not report security problems in public issues. Use GitHub's private reporting instead:
[Report a vulnerability](https://github.com/zihotki/SOMA/security/advisories/new) (tab "Security" > "Report a vulnerability").

Include the CAD Lab Viewer version from Settings > About > Copy system info, your operating system, and the steps or files that trigger the problem.

## Supported versions

The fork maintains the latest source checkout.

## Model execution

Open models from sources that you trust.

- **A model is Python code, and the viewer runs it.** `model.py`, `parts/`, animations, analyses and drawings run with your
  user rights when the viewer builds them, and building starts on its own once you work with a model. Only open `.soma` or ZIP files from people you trust, just like you would
  only run their scripts.
- **Packages a model asks for are installed from PyPI.** Before a build, the viewer installs what a model's
  `requirements.txt` lists into a separate environment for that model. This is part of running the model's code.

What we do want to hear about, for example:

- Opening a model or ZIP file that writes or reads files outside its own folder without running its Python code
  (for example through path traversal in the archive or the project files)
- Model content (file names, part names, Markdown, skills, PDFs) that runs script in the app window
- Ways for a model or an agent to reach the app's internals beyond the documented `soma` command line
