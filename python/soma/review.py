"""Project-local review notes and confirmations, stored as JSON Lines."""
import json
from pathlib import Path
from uuid import uuid4


def _log_path(project):
    root = Path(project).resolve()
    if not root.is_dir():
        raise ValueError(f"Project folder does not exist: {root}")
    path = root / ".soma" / "feedback" / "review.jsonl"
    if not path.resolve().is_relative_to(root) or path.is_symlink():
        raise ValueError("The review log must be a file inside the project.")
    return path


def _read(path):
    comments, addressed = {}, set()
    if not path.exists():
        return comments, addressed
    with path.open(encoding="utf-8") as entries:
        for number, line in enumerate(entries, 1):
            try:
                event = json.loads(line)
                kind, comment_id = event["type"], event["id"]
                if not isinstance(comment_id, str):
                    raise ValueError("Invalid comment ID.")
                if kind == "comment":
                    if not all(isinstance(event[key], str) for key in ("text", "reference")):
                        raise ValueError("Invalid comment.")
                    if event.get("buildId") is not None and not isinstance(event["buildId"], str):
                        raise ValueError("Invalid build ID.")
                    comments[comment_id] = event
                elif kind == "addressed":
                    addressed.add(comment_id)
                else:
                    raise ValueError("Unknown review event.")
            except (ValueError, KeyError, TypeError) as error:
                raise ValueError(f"Invalid review log entry at line {number}.") from error
    return comments, addressed


def _append(path, events):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = "".join(json.dumps(event, ensure_ascii=False) + "\n" for event in events).encode("utf-8")
    with path.open("ab", buffering=0) as log:
        if log.write(data) != len(data):
            raise OSError("Could not write the complete review entry.")


def _metadata(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def pending(project):
    comments, addressed = _read(_log_path(project))
    cache = Path(project) / ".soma"
    model = cache / "model.map.json"
    build = _metadata(model).get("build")
    try:
        model_time = model.stat().st_mtime if build else None
    except OSError:
        model_time = None
    drawings = _metadata(cache / "drawings" / "index.json").get("drawings")
    drawing_builds = {
        sheet["build"] for sheet in (drawings if isinstance(drawings, list) else [])
        if isinstance(sheet, dict) and isinstance(sheet.get("build"), str)
        and model_time is not None
        and isinstance(sheet.get("built"), (int, float)) and sheet["built"] >= model_time
    }
    result = []
    for comment_id, note in comments.items():
        if comment_id in addressed:
            continue
        saved = note.get("buildId")
        stale = bool(saved and (saved not in drawing_builds if saved.startswith("drawing:") else saved != build))
        result.append(dict(note, stale=stale))
    return result


def add(project, text, reference, build_id=None):
    text, reference = text.strip(), reference.strip()
    if not text or not reference:
        raise ValueError("A review comment needs text and a reference.")
    if len(text) > 8000 or len(reference) > 10000 or (build_id and len(build_id) > 100):
        raise ValueError("The review comment or its reference is too long.")
    note = {"type": "comment", "id": uuid4().hex, "text": text,
            "reference": reference, "buildId": build_id}
    _append(_log_path(project), [note])
    return note


def address(project, ids):
    path = _log_path(project)
    comments, addressed = _read(path)
    unknown = set(ids) - comments.keys()
    if unknown:
        raise ValueError(f"Unknown review comment: {', '.join(sorted(unknown))}")
    handled = [comment_id for comment_id in dict.fromkeys(ids) if comment_id not in addressed]
    if handled:
        _append(path, [{"type": "addressed", "id": comment_id} for comment_id in handled])
    return handled
