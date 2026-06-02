from __future__ import annotations

import argparse
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

GENERATED_MARKER = "<!-- AUTO-GENERATED: scripts/check_docs.py -->"
INLINE_BACKTICK_RE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-")


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


def write_indices() -> None:
    for config in GENERATED_INDICES:
        config.output.write_text(render_index(config), encoding="utf-8", newline="\n")
        print(f"generated {relpath(config.output)}")
    CHANGELOG_PATH.write_text(render_changelog(), encoding="utf-8", newline="\n")
    print(f"generated {relpath(CHANGELOG_PATH)}")


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
