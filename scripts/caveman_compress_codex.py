#!/usr/bin/env python3
"""
Compress Markdown context files with Codex instead of Claude.

The script writes a sibling .compact.md file by default, leaving the human
source untouched. It validates exact preservation of structure and technical
spans before writing the compact file.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path


FENCE_OPEN_RE = re.compile(r"^(\s{0,3})(`{3,}|~{3,})(.*)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)", re.MULTILINE)
URL_RE = re.compile(r"https?://[^\s)]+")
PATH_RE = re.compile(
    r"(?:\./|\.\./|/|[A-Za-z]:\\)[\w\-/\\\.]+|[\w\-\.]+[/\\][\w\-/\\\.]+"
)
OUTER_FENCE_RE = re.compile(r"\A\s*(`{3,}|~{3,})[^\n]*\n(.*)\n\1\s*\Z", re.DOTALL)
CRITICAL_WORDS = (
    "no",
    "never",
    "only",
    "except",
    "unless",
    "must",
    "should",
    "do not",
    "must not",
    "cannot",
    "solo",
    "solamente",
    "excepto",
    "salvo",
    "debe",
    "deben",
    "prohibido",
)


class ValidationResult:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    @property
    def ok(self) -> bool:
        return not self.errors

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def strip_outer_fence(text: str) -> str:
    match = OUTER_FENCE_RE.match(text.strip())
    if match:
        return match.group(2).strip() + "\n"
    return text.strip() + "\n"


def extract_headings(text: str) -> list[tuple[str, str]]:
    return [(level, title.strip()) for level, title in HEADING_RE.findall(text)]


def extract_code_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    lines = text.split("\n")
    i = 0
    while i < len(lines):
        match = FENCE_OPEN_RE.match(lines[i])
        if not match:
            i += 1
            continue

        fence_char = match.group(2)[0]
        fence_len = len(match.group(2))
        block = [lines[i]]
        i += 1
        closed = False

        while i < len(lines):
            close_match = FENCE_OPEN_RE.match(lines[i])
            if (
                close_match
                and close_match.group(2)[0] == fence_char
                and len(close_match.group(2)) >= fence_len
                and close_match.group(3).strip() == ""
            ):
                block.append(lines[i])
                i += 1
                closed = True
                break
            block.append(lines[i])
            i += 1

        if closed:
            blocks.append("\n".join(block))

    return blocks


def strip_code_blocks(text: str) -> str:
    for block in extract_code_blocks(text):
        text = text.replace(block, "")
    return text


def extract_inline_code(text: str) -> Counter[str]:
    return Counter(re.findall(r"`([^`]+)`", strip_code_blocks(text)))


def extract_urls(text: str) -> set[str]:
    return set(URL_RE.findall(text))


def extract_paths(text: str) -> set[str]:
    return set(PATH_RE.findall(text))


def critical_counts(text: str) -> Counter[str]:
    lowered = text.lower()
    return Counter({word: lowered.count(word) for word in CRITICAL_WORDS})


def validate(original: str, compressed: str) -> ValidationResult:
    result = ValidationResult()

    if extract_headings(original) != extract_headings(compressed):
        result.error("heading text/order changed")

    if extract_code_blocks(original) != extract_code_blocks(compressed):
        result.error("fenced code blocks changed")

    if extract_inline_code(original) != extract_inline_code(compressed):
        result.error("inline code spans changed")

    original_urls = extract_urls(original)
    compressed_urls = extract_urls(compressed)
    if original_urls != compressed_urls:
        result.error(
            f"URL mismatch lost={sorted(original_urls - compressed_urls)} "
            f"added={sorted(compressed_urls - original_urls)}"
        )

    original_paths = extract_paths(original)
    compressed_paths = extract_paths(compressed)
    if original_paths != compressed_paths:
        result.error(
            f"path mismatch lost={sorted(original_paths - compressed_paths)} "
            f"added={sorted(compressed_paths - original_paths)}"
        )

    original_critical = critical_counts(original)
    compressed_critical = critical_counts(compressed)
    lost_critical = {
        word: (original_critical[word], compressed_critical[word])
        for word in CRITICAL_WORDS
        if compressed_critical[word] < original_critical[word]
    }
    if lost_critical:
        result.warning(f"critical word count decreased: {lost_critical}")

    if len(compressed.encode("utf-8")) >= len(original.encode("utf-8")):
        result.warning("compressed file is not smaller than original")

    return result


def build_compress_prompt(original: str) -> str:
    return f"""You are a Markdown compression engine for Codex context.

Do not use tools. Transform only the text below.
Return ONLY compressed Markdown body. No explanation. No wrapper fence.

Goal:
- Make prose compact in caveman-style context language.
- Preserve technical meaning and decision quality.
- Keep same language as source where possible.
- Target 35-60% fewer bytes when source has prose.
- Rewrite paragraphs as short fragments or bullets when useful.
- Keep every unique decision, rule, risk, command, path, endpoint, and validation point.
- Remove narrative setup, examples that duplicate same rule, and explanatory filler.

STRICT PRESERVE EXACTLY:
- Markdown headings and heading order.
- Fenced code blocks.
- Inline backtick content.
- URLs and Markdown links.
- File paths, commands, flags, environment variables.
- Endpoint paths, service names, permissions, model/table names.
- Dates, version numbers, numeric values.
- Negations and restrictions: no, never, only, except, unless, must, should, do not, must not, cannot, solo, salvo, excepto, debe.

Allowed compression:
- Remove filler, pleasantries, redundant phrasing.
- Use short phrases and fragments.
- Merge duplicate prose only when no technical detail is lost.
- Prefer terse noun/verb phrases over full sentences.

Do NOT invent, delete constraints, reorder sections, or modify examples/code.

TEXT:
{original}
"""


def build_fix_prompt(original: str, compressed: str, errors: list[str]) -> str:
    joined = "\n".join(f"- {error}" for error in errors)
    return f"""Fix this compressed Markdown. Return ONLY fixed Markdown body.

Rules:
- Fix only listed validation errors.
- Do not recompress unrelated text.
- Restore exact missing headings, fenced code, inline code, URLs, or paths from ORIGINAL.
- Preserve compact style elsewhere.

ERRORS:
{joined}

ORIGINAL:
{original}

COMPRESSED:
{compressed}
"""


def call_codex(prompt: str, timeout_seconds: int) -> str:
    with tempfile.TemporaryDirectory(prefix="caveman-codex-") as temp_dir:
        output_path = Path(temp_dir) / "last-message.md"
        command = [
            "codex",
            "exec",
            "--ephemeral",
            "--ignore-rules",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "-C",
            temp_dir,
            "-o",
            str(output_path),
            "-",
        ]
        result = subprocess.run(
            command,
            input=prompt,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=timeout_seconds,
        )
        if result.returncode != 0:
            raise RuntimeError(
                "codex exec failed\n"
                f"stdout:\n{result.stdout[-4000:]}\n"
                f"stderr:\n{result.stderr[-4000:]}"
            )
        if not output_path.exists():
            raise RuntimeError("codex exec did not write output-last-message")
        return strip_outer_fence(read_text(output_path))


def default_output_path(source: Path) -> Path:
    return source.with_name(f"{source.stem}.compact{source.suffix}")


def compress_file(source: Path, output: Path, force: bool, timeout_seconds: int) -> ValidationResult:
    if source.name.endswith(".original.md") or source.name.endswith(".compact.md"):
        raise ValueError(f"refusing to compress generated file: {source}")
    if source.suffix.lower() != ".md":
        raise ValueError(f"only Markdown files are supported: {source}")
    if output.exists() and not force:
        raise FileExistsError(f"output exists, pass --force to overwrite: {output}")
    if source.resolve() == output.resolve():
        raise ValueError("source and output must differ")

    original = read_text(source)
    compressed = call_codex(build_compress_prompt(original), timeout_seconds)
    validation = validate(original, compressed)

    for _ in range(2):
        if validation.ok:
            break
        compressed = call_codex(build_fix_prompt(original, compressed, validation.errors), timeout_seconds)
        validation = validate(original, compressed)

    if validation.ok:
        output.parent.mkdir(parents=True, exist_ok=True)
        write_text(output, compressed)

    return validation


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compress Markdown context files with Codex into .compact.md outputs."
    )
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, help="Output path. Valid only with one source.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing compact files.")
    parser.add_argument("--timeout", type=int, default=180, help="Seconds per Codex call.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.output and len(args.sources) != 1:
        print("--output is valid only with one source", file=sys.stderr)
        return 2

    if not shutil_which("codex"):
        print("codex executable not found in PATH", file=sys.stderr)
        return 2

    exit_code = 0
    for raw_source in args.sources:
        source = raw_source.resolve()
        output = args.output.resolve() if args.output else default_output_path(source)
        print(f"Compressing {source} -> {output}")
        try:
            validation = compress_file(source, output, args.force, args.timeout)
        except Exception as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        for warning in validation.warnings:
            print(f"WARNING: {warning}")
        if validation.ok:
            original_size = source.stat().st_size
            compact_size = output.stat().st_size
            reduction = 100 - (compact_size * 100 / original_size)
            print(f"OK: {compact_size}/{original_size} bytes ({reduction:.1f}% smaller)")
        else:
            print("ERROR: validation failed", file=sys.stderr)
            for error in validation.errors:
                print(f"  - {error}", file=sys.stderr)
            exit_code = 1

    return exit_code


def shutil_which(command: str) -> str | None:
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / command
        if candidate.exists():
            return str(candidate)
        if os.name == "nt":
            for extension in (".exe", ".cmd", ".bat", ".ps1"):
                candidate_with_ext = Path(directory) / f"{command}{extension}"
                if candidate_with_ext.exists():
                    return str(candidate_with_ext)
    return None


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
