from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
INDICE_PATH = DOCS_DIR / "indice.md"
CAMBIOS_DIR = DOCS_DIR / "registro" / "cambios"
CHANGELOG_PATH = REPO_ROOT / "CHANGELOG.md"
CHANGELOG_JSON_PATH = REPO_ROOT / "frontend" / "app" / "data" / "changelog.generated.json"

GENERATED_MARKER = "<!-- AUTO-GENERATED: scripts/check_docs.py -->"
INLINE_BACKTICK_RE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-")

# Headings that describe the "what" of a change (shown in the UI).
# Technical sections (Archivos modificados, Validacion, etc.) are excluded.
DISPLAY_SECTION_HEADINGS: frozenset[str] = frozenset({
    "contexto",
    "cambio",
    "que cambio",
    "que cambia",
    "descripcion",
    "descripción",
    "resumen",
    "overview",
})

_CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```")
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_INLINE_CODE_RE = re.compile(r"`([^`\n]+)`")


@dataclass(frozen=True)
class GeneratedIndex:
    directory: Path
    output: Path
    title: str
    description: str
    reverse: bool = False


GENERATED_INDICES = (
    GeneratedIndex(
        directory=DOCS_DIR / "registro" / "cambios",
        output=DOCS_DIR / "registro" / "cambios" / "index.md",
        title="Cambios Registrados",
        description=(
            "Indice generado de cambios funcionales o visibles registrados en "
            "`docs/registro/cambios/`, mas nuevo arriba."
        ),
        reverse=True,
    ),
    GeneratedIndex(
        directory=DOCS_DIR / "registro" / "decisiones",
        output=DOCS_DIR / "registro" / "decisiones" / "index.md",
        title="Decisiones Registradas",
        description=(
            "Indice generado de decisiones de arquitectura, contrato o negocio "
            "registradas en `docs/registro/decisiones/`."
        ),
    ),
    GeneratedIndex(
        directory=DOCS_DIR / "plans",
        output=DOCS_DIR / "plans" / "index.md",
        title="Planes",
        description="Indice generado de planes y disenos historicos en `docs/plans/`.",
    ),
)


def relpath(path: Path, start: Path = REPO_ROOT) -> str:
    return path.relative_to(start).as_posix()


def fail(message: str) -> None:
    print(f"docs-check: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_h1(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    match = H1_RE.search(text)
    if not match:
        fail(f"{relpath(path)} must contain a top-level '# ' heading")
    return match.group(1).strip()


def iter_index_sources(directory: Path, output: Path) -> list[Path]:
    if not directory.exists():
        fail(f"Missing directory: {relpath(directory)}")

    return sorted(
        path
        for path in directory.glob("*.md")
        if path.name != output.name and not path.name.endswith(".compact.md")
    )


def render_index(config: GeneratedIndex) -> str:
    rows = []
    sources = iter_index_sources(config.directory, config.output)
    if config.reverse:
        sources = list(reversed(sources))
    for path in sources:
        title = read_h1(path)
        rows.append(f"- [{title}]({path.name})")

    body = "\n".join(rows) if rows else "_No hay archivos registrados todavia._"
    return "\n".join(
        [
            GENERATED_MARKER,
            f"# {config.title}",
            "",
            config.description,
            "",
            "No editar manualmente. Regenerar con:",
            "",
            "```powershell",
            "py -3 scripts/check_docs.py --write --skip-build",
            "```",
            "",
            body,
            "",
        ]
    )


def iter_changelog_sources() -> list[Path]:
    if not CAMBIOS_DIR.exists():
        fail(f"Missing directory: {relpath(CAMBIOS_DIR)}")

    return sorted(
        path
        for path in CAMBIOS_DIR.glob("*.md")
        if path.name != "index.md" and not path.name.endswith(".compact.md")
    )


def render_changelog() -> str:
    grouped: dict[str, list[tuple[str, str, str]]] = {}
    for path in iter_changelog_sources():
        match = DATE_PREFIX_RE.match(path.name)
        if not match:
            fail(
                f"{relpath(path)} must start with a YYYY-MM-DD prefix "
                "(convention: YYYY-MM-DD-<tema>.md)"
            )
        title = read_h1(path)
        link = path.relative_to(REPO_ROOT).as_posix()
        grouped.setdefault(match.group(1), []).append((path.name, title, link))

    header = [
        GENERATED_MARKER,
        "# Changelog",
        "",
        "Cambios funcionales y visibles de ShineApp, mas nuevo arriba.",
        "Generado desde `docs/registro/cambios/`. No editar manualmente.",
        "",
        "Regenerar con:",
        "",
        "```powershell",
        "py -3 scripts/check_docs.py --write --skip-build",
        "```",
        "",
    ]

    if not grouped:
        return "\n".join([*header, "_No hay cambios registrados todavia._", ""])

    body: list[str] = []
    for date in sorted(grouped, reverse=True):
        body.append(f"## {date}")
        for _name, title, link in sorted(grouped[date], reverse=True):
            body.append(f"- [{title}]({link})")
        body.append("")

    return "\n".join([*header, *body])


# ── Changelog JSON (for the Novedades UI panel) ──────────────────────────────


def _strip_md_inline(text: str) -> str:
    """Remove code blocks, inline code, and bold markers; collapse extra blank lines."""
    text = _CODE_BLOCK_RE.sub("", text)
    text = _INLINE_CODE_RE.sub(r"\1", text)
    text = _BOLD_RE.sub(r"\1", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _parse_md_sections(text: str) -> list[dict]:
    """Extract ## sections from a markdown document as [{heading, text}]."""
    sections: list[dict] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    for line in text.splitlines():
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            if current_heading is not None:
                content = _strip_md_inline("\n".join(current_lines))
                if content:
                    sections.append({"heading": current_heading, "text": content})
            current_heading = m.group(1)
            current_lines = []
        elif current_heading is not None:
            current_lines.append(line)

    if current_heading is not None:
        content = _strip_md_inline("\n".join(current_lines))
        if content:
            sections.append({"heading": current_heading, "text": content})

    return sections


def _select_display_sections(sections: list[dict]) -> list[dict]:
    """Pick up to 2 display sections: prefer known headings, else take the first two."""
    preferred = [
        s for s in sections
        if s["heading"].lower() in DISPLAY_SECTION_HEADINGS and s["text"]
    ]
    if preferred:
        return preferred[:2]
    return [s for s in sections if s["text"]][:2]


def render_changelog_json() -> str:
    """Generate the JSON consumed by the Novedades UI panel."""
    grouped: dict[str, list[dict]] = {}
    for path in iter_changelog_sources():
        m = DATE_PREFIX_RE.match(path.name)
        if not m:
            continue
        date = m.group(1)
        slug = DATE_PREFIX_RE.sub("", path.stem)
        text = path.read_text(encoding="utf-8")
        title = read_h1(path)
        all_sections = _parse_md_sections(text)
        display_sections = _select_display_sections(all_sections)
        grouped.setdefault(date, []).append(
            {"slug": slug, "title": title, "sections": display_sections}
        )

    result = []
    for date in sorted(grouped, reverse=True):
        items = sorted(grouped[date], key=lambda x: x["slug"], reverse=True)
        result.append({"date": date, "items": items})

    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


# ── Write / check ────────────────────────────────────────────────────────────


def write_indices() -> None:
    for config in GENERATED_INDICES:
        config.output.write_text(render_index(config), encoding="utf-8", newline="\n")
        print(f"generated {relpath(config.output)}")
    CHANGELOG_PATH.write_text(render_changelog(), encoding="utf-8", newline="\n")
    print(f"generated {relpath(CHANGELOG_PATH)}")
    CHANGELOG_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    CHANGELOG_JSON_PATH.write_text(render_changelog_json(), encoding="utf-8", newline="\n")
    print(f"generated {relpath(CHANGELOG_JSON_PATH)}")


def check_indices() -> None:
    for config in GENERATED_INDICES:
        expected = render_index(config)
        if not config.output.exists():
            fail(f"Missing generated index: {relpath(config.output)}")
        actual = config.output.read_text(encoding="utf-8")
        if actual != expected:
            fail(
                f"{relpath(config.output)} is stale. "
                "Run: py -3 scripts/check_docs.py --write --skip-build"
            )

    expected_changelog = render_changelog()
    if not CHANGELOG_PATH.exists():
        fail(f"Missing generated changelog: {relpath(CHANGELOG_PATH)}")
    if CHANGELOG_PATH.read_text(encoding="utf-8") != expected_changelog:
        fail(
            f"{relpath(CHANGELOG_PATH)} is stale. "
            "Run: py -3 scripts/check_docs.py --write --skip-build"
        )



def is_path_candidate(value: str) -> bool:
    if value.startswith(("http://", "https://")):
        return False
    if "*" in value:
        return False
    if any(separator in value for separator in ("/", "\\")):
        return True
    return Path(value).suffix in {".md", ".yml", ".yaml", ".py", ".txt", ".ps1"}


def normalize_reference(value: str) -> str:
    value = value.strip().replace("\\", "/")
    if "#" in value:
        value = value.split("#", 1)[0]
    return value


def check_indice_references() -> None:
    if not INDICE_PATH.exists():
        fail("Missing docs/indice.md")

    text = INDICE_PATH.read_text(encoding="utf-8")
    missing = []
    references = set()

    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        references.update(INLINE_BACKTICK_RE.findall(line))

    for raw in sorted(references):
        reference = normalize_reference(raw)
        if not reference or not is_path_candidate(reference):
            continue

        target = (REPO_ROOT / reference).resolve()
        try:
            target.relative_to(REPO_ROOT)
        except ValueError:
            fail(f"docs/indice.md references path outside repo: {raw}")

        if not target.exists():
            missing.append(reference)

    if missing:
        fail(
            "docs/indice.md references missing canonical files:\n"
            + "\n".join(f"- {path}" for path in missing)
        )


def run_mkdocs_build() -> None:
    command = [sys.executable, "-m", "mkdocs", "build", "--strict"]
    print("running " + " ".join(command))
    subprocess.run(command, cwd=REPO_ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate ShineApp living documentation.")
    parser.add_argument("--write", action="store_true", help="Regenerate deterministic docs indices.")
    parser.add_argument("--check", action="store_true", help="Check generated indices and docs references.")
    parser.add_argument("--skip-build", action="store_true", help="Skip mkdocs build validation.")
    args = parser.parse_args()

    if args.write and args.check:
        fail("Use either --write or --check, not both")
    if not args.write and not args.check:
        args.check = True

    if args.write:
        write_indices()
    else:
        check_indices()

    check_indice_references()

    if not args.skip_build:
        run_mkdocs_build()

    print("docs-check: OK")


if __name__ == "__main__":
    main()
