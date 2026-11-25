"""Enforce the module dependency rule.

Every module under ``modules/<name>/`` has a ``module.toml`` manifest that declares exactly which other
modules it depends on. This check fails when:

1. a manifest is malformed, or names an unknown module;
2. the declared dependencies contain a cycle;
3. Python code in a module imports another module's package (``kundli_<name>``) that the manifest does
   not declare (this includes the module's tests and ``importlib.import_module("kundli_x")`` with a literal);
4. a Python module's ``pyproject.toml`` dependencies on ``kundli-*`` packages differ from the manifest, or
   lack a ``[tool.uv.sources]`` workspace entry;
5. web code imports a file outside ``modules/web`` or a bare package specifier;
6. the generated block in ``MODULES.md`` is out of date (``--write`` regenerates it).

Usage: ``python tools/check_modules.py [--root PATH] [--write]``. Exit status 0 means no problems.
Standard library only, so it runs before any module is installed.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

PACKAGE_PREFIX = "kundli_"
DIST_PREFIX = "kundli-"
KINDS = {"python", "web"}
GRAPH_BEGIN = "<!-- BEGIN GENERATED: module graph (python tools/check_modules.py --write) -->"
GRAPH_END = "<!-- END GENERATED: module graph -->"
SKIP_DIRS = {".venv", "__pycache__", ".pytest_cache", "node_modules", "build", "dist"}


@dataclass(frozen=True)
class Manifest:
    name: str
    kind: str
    package: str | None
    depends_on: tuple[str, ...]
    http_depends_on: tuple[str, ...]
    path: Path


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)

    def add(self, msg: str) -> None:
        self.errors.append(msg)


def load_manifests(root: Path, report: Report) -> dict[str, Manifest]:
    manifests: dict[str, Manifest] = {}
    modules_dir = root / "modules"
    if not modules_dir.is_dir():
        return manifests
    for mdir in sorted(p for p in modules_dir.iterdir() if p.is_dir()):
        mfile = mdir / "module.toml"
        if not mfile.is_file():
            report.add(f"{mdir.relative_to(root)}: missing module.toml")
            continue
        try:
            data = tomllib.loads(mfile.read_text(encoding="utf-8"))
        except tomllib.TOMLDecodeError as exc:
            report.add(f"{mfile.relative_to(root)}: invalid TOML: {exc}")
            continue
        rel = mfile.relative_to(root)
        name = data.get("name")
        kind = data.get("kind")
        deps = data.get("depends_on", [])
        http = data.get("http_depends_on", [])
        package = data.get("package")
        unknown_keys = set(data) - {"name", "kind", "package", "depends_on", "http_depends_on", "description"}
        if unknown_keys:
            report.add(f"{rel}: unknown keys {sorted(unknown_keys)}")
        if name != mdir.name:
            report.add(f"{rel}: name {name!r} must equal the directory name {mdir.name!r}")
            continue
        if kind not in KINDS:
            report.add(f"{rel}: kind must be one of {sorted(KINDS)}, got {kind!r}")
            continue
        if not isinstance(deps, list) or not all(isinstance(d, str) for d in deps):
            report.add(f"{rel}: depends_on must be a list of module names")
            continue
        if not isinstance(http, list) or not all(isinstance(d, str) for d in http):
            report.add(f"{rel}: http_depends_on must be a list of module names")
            continue
        if len(set(deps)) != len(deps):
            report.add(f"{rel}: depends_on lists a module twice")
        if kind == "python":
            expected = PACKAGE_PREFIX + name
            if package != expected:
                report.add(f"{rel}: package must be {expected!r}, got {package!r}")
        elif package is not None:
            report.add(f"{rel}: a web module has no Python package")
        manifests[name] = Manifest(name, kind, package, tuple(deps), tuple(http), mdir)
    return manifests


def check_graph(manifests: dict[str, Manifest], root: Path, report: Report) -> None:
    for m in manifests.values():
        rel = (m.path / "module.toml").relative_to(root)
        for dep in m.depends_on:
            if dep == m.name:
                report.add(f"{rel}: a module cannot depend on itself")
            elif dep not in manifests:
                report.add(f"{rel}: depends_on names unknown module {dep!r}")
            elif manifests[dep].kind != "python":
                report.add(f"{rel}: cannot import from {dep!r}, which is a web module")
        for dep in m.http_depends_on:
            if dep not in manifests:
                report.add(f"{rel}: http_depends_on names unknown module {dep!r}")
        if m.kind == "web" and m.depends_on:
            report.add(f"{rel}: a web module talks to other modules over HTTP only; use http_depends_on")

    for cycle in find_cycles(manifests):
        report.add("dependency cycle: " + " -> ".join(cycle))


def find_cycles(manifests: dict[str, Manifest]) -> list[list[str]]:
    """Depth-first search over declared code dependencies; returns each back-edge cycle found."""
    colour = dict.fromkeys(manifests, 0)  # 0 unvisited, 1 on the current path, 2 finished
    path: list[str] = []
    cycles: list[list[str]] = []

    def dfs(node: str) -> None:
        colour[node] = 1
        path.append(node)
        for dep in manifests[node].depends_on:
            if dep not in manifests:
                continue
            if colour[dep] == 1:
                cycles.append(path[path.index(dep):] + [dep])
            elif colour[dep] == 0:
                dfs(dep)
        path.pop()
        colour[node] = 2

    for name in sorted(manifests):
        if colour[name] == 0:
            dfs(name)
    return cycles


def _python_files(mdir: Path):
    for p in sorted(mdir.rglob("*.py")):
        if not SKIP_DIRS.intersection(p.relative_to(mdir).parts):
            yield p


def _imported_packages(tree: ast.AST):
    """Yield (top-level package, line) for absolute imports and literal importlib/__import__ calls."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name.split(".")[0], node.lineno
        elif isinstance(node, ast.ImportFrom):
            if node.level == 0 and node.module:
                yield node.module.split(".")[0], node.lineno
        elif isinstance(node, ast.Call) and node.args:
            func = node.func
            is_dynamic = (isinstance(func, ast.Attribute) and func.attr == "import_module") or (
                isinstance(func, ast.Name) and func.id in {"__import__", "import_module"}
            )
            arg = node.args[0]
            if is_dynamic and isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                yield arg.value.split(".")[0], node.lineno


def check_python_imports(manifests: dict[str, Manifest], root: Path, report: Report) -> None:
    by_package = {m.package: m.name for m in manifests.values() if m.package}
    for m in manifests.values():
        if m.kind != "python":
            continue
        allowed = set(m.depends_on) | {m.name}
        for py in _python_files(m.path):
            rel = py.relative_to(root)
            try:
                tree = ast.parse(py.read_text(encoding="utf-8"), filename=str(rel))
            except SyntaxError as exc:
                report.add(f"{rel}:{exc.lineno}: cannot parse: {exc.msg}")
                continue
            for pkg, line in _imported_packages(tree):
                if not pkg.startswith(PACKAGE_PREFIX):
                    continue
                target = by_package.get(pkg)
                if target is None:
                    report.add(f"{rel}:{line}: imports {pkg!r}, which is not a known module package")
                elif target not in allowed:
                    report.add(
                        f"{rel}:{line}: imports {pkg!r} but modules/{m.name}/module.toml does not declare {target!r}"
                    )


_REQ_NAME = re.compile(r"^\s*([A-Za-z0-9][A-Za-z0-9._-]*)")


def _dist_name(req: str) -> str:
    m = _REQ_NAME.match(req)
    return re.sub(r"[-_.]+", "-", m.group(1)).lower() if m else ""


def check_pyprojects(manifests: dict[str, Manifest], root: Path, report: Report) -> None:
    for m in manifests.values():
        if m.kind != "python":
            continue
        ppath = m.path / "pyproject.toml"
        rel = ppath.relative_to(root)
        if not ppath.is_file():
            report.add(f"{rel}: missing")
            continue
        data = tomllib.loads(ppath.read_text(encoding="utf-8"))
        project = data.get("project", {})
        if _dist_name(project.get("name", "")) != DIST_PREFIX + m.name:
            report.add(f"{rel}: [project].name must be {DIST_PREFIX + m.name!r}")
        declared = {
            _dist_name(r)[len(DIST_PREFIX):]
            for r in project.get("dependencies", [])
            if _dist_name(r).startswith(DIST_PREFIX)
        }
        if declared != set(m.depends_on):
            report.add(
                f"{rel}: kundli-* dependencies {sorted(declared)} differ from module.toml depends_on {sorted(m.depends_on)}"
            )
        sources = data.get("tool", {}).get("uv", {}).get("sources", {})
        for dep in m.depends_on:
            src = sources.get(DIST_PREFIX + dep)
            if not (isinstance(src, dict) and src.get("workspace") is True):
                report.add(f"{rel}: [tool.uv.sources] needs {DIST_PREFIX + dep} = {{ workspace = true }}")


_JS_IMPORT = re.compile(
    r"""(?:\bimport\s+(?:[^'"]*?\s+from\s+)?|\bimport\s*\(\s*|\bexport\s+[^'"]*?\s+from\s+)['"]([^'"]+)['"]"""
)
_HTML_REF = re.compile(r"""<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*['"]([^'"]+)['"]""", re.IGNORECASE)


def check_web_imports(manifests: dict[str, Manifest], root: Path, report: Report) -> None:
    for m in manifests.values():
        if m.kind != "web":
            continue
        base = m.path.resolve()
        for f in sorted(m.path.rglob("*")):
            if f.suffix not in {".js", ".mjs", ".html"} or SKIP_DIRS.intersection(f.relative_to(m.path).parts):
                continue
            text = f.read_text(encoding="utf-8")
            rel = f.relative_to(root)
            refs = [(mt.group(1), text.count("\n", 0, mt.start()) + 1) for mt in _JS_IMPORT.finditer(text)]
            if f.suffix == ".html":
                refs += [(mt.group(1), text.count("\n", 0, mt.start()) + 1) for mt in _HTML_REF.finditer(text)]
            for spec, line in refs:
                if re.match(r"^[a-z]+:", spec) or spec.startswith("//"):
                    report.add(f"{rel}:{line}: loads {spec!r} from another origin; serve it from modules/web")
                elif spec.startswith("/"):
                    continue  # a URL path served by the api (e.g. /static/app.js, /theme.css)
                elif spec.startswith("."):
                    target = (f.parent / spec).resolve()
                    if base not in target.parents and target != base:
                        report.add(f"{rel}:{line}: imports {spec!r}, which is outside modules/{m.name}")
                elif f.suffix != ".html":
                    report.add(f"{rel}:{line}: imports bare specifier {spec!r}; web has no package dependencies")


def render_graph(manifests: dict[str, Manifest]) -> str:
    lines = [GRAPH_BEGIN, ""]
    if not manifests:
        lines += ["_No modules yet._", ""]
    else:
        lines += ["| Module | Kind | Depends on (imports) | Talks to over HTTP |", "|---|---|---|---|"]
        for name in sorted(manifests, key=lambda n: (len(_closure(manifests, n)), n)):
            m = manifests[name]
            lines.append(
                f"| `{name}` | {m.kind} | {', '.join(f'`{d}`' for d in m.depends_on) or '—'} | "
                f"{', '.join(f'`{d}`' for d in m.http_depends_on) or '—'} |"
            )
        lines += ["", "```mermaid", "graph BT"]
        for name in sorted(manifests):
            m = manifests[name]
            if not m.depends_on and not m.http_depends_on:
                lines.append(f"  {name}")
            for dep in m.depends_on:
                lines.append(f"  {name} --> {dep}")
            for dep in m.http_depends_on:
                lines.append(f"  {name} -. HTTP .-> {dep}")
        lines += ["```", ""]
    lines.append(GRAPH_END)
    return "\n".join(lines)


def _closure(manifests: dict[str, Manifest], name: str, seen: set[str] | None = None) -> set[str]:
    seen = set() if seen is None else seen
    for dep in manifests[name].depends_on if name in manifests else ():
        if dep in manifests and dep not in seen:
            seen.add(dep)
            _closure(manifests, dep, seen)
    return seen


def check_modules_md(manifests: dict[str, Manifest], root: Path, report: Report, write: bool) -> None:
    path = root / "MODULES.md"
    if not path.is_file():
        report.add("MODULES.md: missing")
        return
    text = path.read_text(encoding="utf-8")
    start, end = text.find(GRAPH_BEGIN), text.find(GRAPH_END)
    if start < 0 or end < start:
        report.add("MODULES.md: generated graph markers are missing")
        return
    current = text[start : end + len(GRAPH_END)]
    wanted = render_graph(manifests)
    if current != wanted:
        if write:
            path.write_text(text[:start] + wanted + text[end + len(GRAPH_END) :], encoding="utf-8")
        else:
            report.add("MODULES.md: generated module graph is out of date; run python tools/check_modules.py --write")


def run(root: Path, write: bool = False) -> list[str]:
    report = Report()
    manifests = load_manifests(root, report)
    check_graph(manifests, root, report)
    check_python_imports(manifests, root, report)
    check_pyprojects(manifests, root, report)
    check_web_imports(manifests, root, report)
    check_modules_md(manifests, root, report, write)
    return report.errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--write", action="store_true", help="regenerate the graph block in MODULES.md")
    args = parser.parse_args(argv)
    errors = run(args.root.resolve(), write=args.write)
    for e in errors:
        print(f"error: {e}", file=sys.stderr)
    if errors:
        print(f"{len(errors)} module dependency problem(s)", file=sys.stderr)
        return 1
    print("module dependencies OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
