"""Tests for tools/check_modules.py: each rule is exercised on a small fake repository."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

TOOLS = Path(__file__).resolve().parents[1]
REPO = TOOLS.parent
_spec = importlib.util.spec_from_file_location("check_modules", TOOLS / "check_modules.py")
check_modules = importlib.util.module_from_spec(_spec)
sys.modules["check_modules"] = check_modules
_spec.loader.exec_module(check_modules)


def make_module(root: Path, name: str, deps=(), kind="python", http=(), code="", pyproject_deps=None, sources=True):
    mdir = root / "modules" / name
    mdir.mkdir(parents=True)
    lines = [f'name = "{name}"', f'kind = "{kind}"']
    if kind == "python":
        lines.append(f'package = "kundli_{name}"')
    lines.append("depends_on = [" + ", ".join(f'"{d}"' for d in deps) + "]")
    if http:
        lines.append("http_depends_on = [" + ", ".join(f'"{d}"' for d in http) + "]")
    (mdir / "module.toml").write_text("\n".join(lines) + "\n")
    if kind == "python":
        pdeps = list(deps) if pyproject_deps is None else list(pyproject_deps)
        src = "\n".join(f"kundli-{d} = {{ workspace = true }}" for d in pdeps) if sources else ""
        (mdir / "pyproject.toml").write_text(
            f'[project]\nname = "kundli-{name}"\nversion = "0.1.0"\n'
            f"dependencies = [{', '.join(repr('kundli-' + d + '>=0.1') for d in pdeps)}]\n"
            f"\n[tool.uv.sources]\n{src}\n"
        )
        pkg = mdir / "src" / f"kundli_{name}"
        pkg.mkdir(parents=True)
        (pkg / "__init__.py").write_text(code)
    return mdir


def finish(root: Path) -> list[str]:
    """Write a MODULES.md with an up-to-date graph block, then run the check."""
    (root / "MODULES.md").write_text(f"# Modules\n\n{check_modules.GRAPH_BEGIN}\n{check_modules.GRAPH_END}\n")
    check_modules.run(root, write=True)
    return check_modules.run(root)


def test_clean_tree_passes(tmp_path):
    make_module(tmp_path, "core")
    make_module(tmp_path, "bhava", deps=["core"], code="import kundli_core\nfrom kundli_core.models import X\n")
    make_module(tmp_path, "placement", deps=["core", "bhava"], code="from kundli_bhava import assign\nimport kundli_core\n")
    assert finish(tmp_path) == []


def test_undeclared_import_fails(tmp_path):
    make_module(tmp_path, "core")
    make_module(tmp_path, "bhava", deps=["core"])
    make_module(tmp_path, "placement", deps=["bhava"], code="import kundli_core\n")
    errors = finish(tmp_path)
    assert any("placement" in e and "does not declare 'core'" in e for e in errors), errors


def test_undeclared_import_in_tests_fails(tmp_path):
    make_module(tmp_path, "core")
    mdir = make_module(tmp_path, "bhava")
    (mdir / "tests").mkdir()
    (mdir / "tests" / "test_x.py").write_text("def test():\n    from kundli_core import rasi_of\n")
    errors = finish(tmp_path)
    assert any("tests/test_x.py:2" in e and "'core'" in e for e in errors), errors


def test_dynamic_import_with_literal_is_checked(tmp_path):
    make_module(tmp_path, "core")
    make_module(tmp_path, "chart", code="import importlib\nm = importlib.import_module('kundli_core.models')\n")
    errors = finish(tmp_path)
    assert any("chart" in e and "'core'" in e for e in errors), errors


def test_unknown_package_import_fails(tmp_path):
    make_module(tmp_path, "core", code="import kundli_missing\n")
    errors = finish(tmp_path)
    assert any("kundli_missing" in e for e in errors), errors


def test_third_party_and_relative_imports_are_ignored(tmp_path):
    make_module(tmp_path, "core", code="import os\nimport swisseph\nfrom . import models\nfrom .x import y\n")
    assert finish(tmp_path) == []


def test_cycle_fails(tmp_path):
    make_module(tmp_path, "a", deps=["b"])
    make_module(tmp_path, "b", deps=["c"])
    make_module(tmp_path, "c", deps=["a"])
    errors = finish(tmp_path)
    cycles = [e for e in errors if e.startswith("dependency cycle")]
    assert cycles == ["dependency cycle: a -> b -> c -> a"], errors


def test_self_and_unknown_dependency_fail(tmp_path):
    make_module(tmp_path, "core", deps=["core", "ghost"], pyproject_deps=[])
    errors = finish(tmp_path)
    assert any("cannot depend on itself" in e for e in errors), errors
    assert any("unknown module 'ghost'" in e for e in errors), errors


def test_pyproject_must_match_manifest(tmp_path):
    make_module(tmp_path, "core")
    make_module(tmp_path, "bhava", deps=["core"], pyproject_deps=[])
    errors = finish(tmp_path)
    assert any("bhava/pyproject.toml" in e and "differ" in e for e in errors), errors


def test_pyproject_needs_workspace_source(tmp_path):
    make_module(tmp_path, "core")
    make_module(tmp_path, "bhava", deps=["core"], sources=False)
    errors = finish(tmp_path)
    assert any("kundli-core = { workspace = true }" in e for e in errors), errors


def test_manifest_name_must_match_directory(tmp_path):
    mdir = make_module(tmp_path, "core")
    (mdir / "module.toml").write_text('name = "kore"\nkind = "python"\npackage = "kundli_kore"\ndepends_on = []\n')
    errors = finish(tmp_path)
    assert any("must equal the directory name" in e for e in errors), errors


def test_web_rules(tmp_path):
    make_module(tmp_path, "api")
    web = make_module(tmp_path, "web", kind="web", http=["api"])
    static = web / "static"
    static.mkdir()
    (static / "app.js").write_text(
        "import { a } from './util.js';\nimport x from '../../api/src/x.js';\nimport y from 'lodash';\n"
    )
    (static / "util.js").write_text("export const a = 1;\n")
    (static / "index.html").write_text(
        '<link rel="stylesheet" href="styles.css">\n<script type="module" src="/static/app.js"></script>\n'
        '<link href="https://fonts.example.com/x.css" rel="stylesheet">\n'
    )
    errors = finish(tmp_path)
    assert any("app.js:2" in e and "outside modules/web" in e for e in errors), errors
    assert any("app.js:3" in e and "bare specifier 'lodash'" in e for e in errors), errors
    assert any("index.html:3" in e and "another origin" in e for e in errors), errors
    assert not any("util.js" in e or "app.js:1" in e or "index.html:1" in e or "index.html:2" in e for e in errors)


def test_node_builtins_are_allowed_only_in_web_tests(tmp_path):
    make_module(tmp_path, "api")
    web = make_module(tmp_path, "web", kind="web", http=["api"])
    (web / "static").mkdir()
    (web / "tests").mkdir()
    (web / "static" / "render.js").write_text("export const x = 1;\n")
    (web / "tests" / "render.test.js").write_text(
        "import { test } from 'node:test';\nimport { x } from '../static/render.js';\n"
    )
    (web / "static" / "app.js").write_text("import fs from 'node:fs';\n")
    errors = finish(tmp_path)
    assert errors == ["modules/web/static/app.js:1: loads 'node:fs' from another origin; serve it from modules/web"]


def test_web_cannot_import_python_modules(tmp_path):
    make_module(tmp_path, "api")
    mdir = make_module(tmp_path, "web", kind="web")
    (mdir / "module.toml").write_text('name = "web"\nkind = "web"\ndepends_on = ["api"]\n')
    errors = finish(tmp_path)
    assert any("over HTTP only" in e for e in errors), errors


def test_stale_modules_md_fails_and_write_fixes_it(tmp_path):
    make_module(tmp_path, "core")
    assert finish(tmp_path) == []
    make_module(tmp_path, "bhava", deps=["core"])
    assert any("out of date" in e for e in check_modules.run(tmp_path))
    check_modules.run(tmp_path, write=True)
    assert check_modules.run(tmp_path) == []
    text = (tmp_path / "MODULES.md").read_text()
    assert "| `bhava` | python | `core` | — |" in text
    assert "  bhava --> core" in text


def test_main_exit_status(tmp_path, capsys):
    make_module(tmp_path, "core", code="import kundli_bhava\n")
    make_module(tmp_path, "bhava")
    finish(tmp_path)
    assert check_modules.main(["--root", str(tmp_path)]) == 1
    assert "does not declare 'bhava'" in capsys.readouterr().err


@pytest.mark.parametrize("root", [REPO])
def test_this_repository_passes(root):
    """The real repository must satisfy its own dependency rule."""
    assert check_modules.run(root) == []
