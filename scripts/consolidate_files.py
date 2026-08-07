"""
Script to collect specific project files into a single consolidated text file.

Usage:
    python scripts/consolidate_files.py

Or with custom paths:
    python scripts/consolidate_files.py --output ./docs/combined.txt
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_FILE = PROJECT_ROOT / "docs" / "combine_files.txt"
DEFAULT_FILES = [
    "schemas/salary_model.py",
    "router/salary.py",
    "user/user_crud.py",
    "migrations/0002_add_appearance_settings.py",
    "schemas/role_permission_model.py",
    "frontend/src/components/Salary/ManageSalary.tsx",
    "frontend/src/components/Setup/ManageRolePermissions.tsx",
    "frontend/src/api/Salary/SalaryAPI.ts",
    "frontend/src/components/dashboard/Sidebar.tsx",
    "frontend/src/utils/rolePermissions.ts",
]
IGNORE_FOLDERS = {".venv", "__pycache__", ".git", ".next", "node_modules", ".vercel"}
IGNORE_EXTENSIONS = {".woff", ".woff2", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg"}


def should_ignore(file_path: str) -> bool:
    """Check if file should be ignored based on extension or folder."""
    for ignore_folder in IGNORE_FOLDERS:
        if ignore_folder in file_path.split(os.sep):
            return True

    _, ext = os.path.splitext(file_path)
    if ext.lower() in IGNORE_EXTENSIONS:
        return True

    return False


def resolve_path(path_value: str) -> Path:
    """Resolve a path relative to the project root when needed."""
    if os.path.isabs(path_value):
        return Path(path_value)
    return PROJECT_ROOT / path_value


def read_file_safe(file_path: Path, max_size: int = 1024 * 1024) -> str:
    """Safely read file content with error handling."""
    try:
        file_size = file_path.stat().st_size
        if file_size > max_size:
            return f"[FILE TOO LARGE: {file_size / 1024 / 1024:.2f}MB - skipped]"

        with file_path.open("r", encoding="utf-8", errors="ignore") as handle:
            return handle.read()
    except Exception as exc:
        return f"[ERROR READING FILE: {exc}]"


def collect_input_files(explicit_files: list[str] | None = None) -> list[Path]:
    """Collect the requested files, falling back to the default target list."""
    files_to_use = explicit_files or DEFAULT_FILES
    collected: list[Path] = []

    for item in files_to_use:
        path_value = resolve_path(item)
        if not path_value.exists():
            print(f"⚠️ Missing file: {item}")
            continue
        if path_value.is_file() and not should_ignore(str(path_value)):
            collected.append(path_value)

    return sorted(collected, key=lambda p: p.as_posix())


def consolidate_files(output_file: str, explicit_files: list[str] | None = None) -> dict:
    """Consolidate the selected files into a single text file."""
    output_path = Path(output_file)
    if not output_path.is_absolute():
        output_path = PROJECT_ROOT / output_path

    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_files = collect_input_files(explicit_files)

    stats = {
        "total_files": len(all_files),
        "processed_files": 0,
        "ignored_files": 0,
        "error_count": 0,
        "total_size": 0,
    }

    try:
        with output_path.open("w", encoding="utf-8") as outf:
            outf.write("=" * 80 + "\n")
            outf.write("CONSOLIDATED FILE CONTENT\n")
            outf.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outf.write(f"Project Root: {PROJECT_ROOT}\n")
            outf.write(f"Output File: {output_path}\n")
            outf.write(f"Target Files: {len(all_files)}\n")
            outf.write("=" * 80 + "\n\n")

            for idx, file_path in enumerate(all_files, 1):
                rel_path = file_path.relative_to(PROJECT_ROOT).as_posix()
                try:
                    content = read_file_safe(file_path)
                    file_size = file_path.stat().st_size
                    stats["total_size"] += file_size

                    outf.write("\n" + "-" * 80 + "\n")
                    outf.write(f"FILE [{idx}/{len(all_files)}]: {rel_path}\n")
                    outf.write(f"Size: {file_size:,} bytes\n")
                    outf.write("-" * 80 + "\n")
                    outf.write(content)

                    if not content.endswith("\n"):
                        outf.write("\n")

                    stats["processed_files"] += 1
                    print(f"✅ [{idx}/{len(all_files)}] Processed: {rel_path}")
                except Exception as exc:
                    stats["error_count"] += 1
                    outf.write(f"\n[ERROR PROCESSING FILE: {exc}]\n")
                    print(f"❌ Error processing: {rel_path}")

            outf.write("\n" + "=" * 80 + "\n")
            outf.write("END OF CONSOLIDATED CONTENT\n")
            outf.write(f"Total files processed: {stats['processed_files']}\n")
            outf.write(f"Total size: {stats['total_size']:,} bytes ({stats['total_size']/1024/1024:.2f}MB)\n")
            outf.write("=" * 80 + "\n")

        stats["success"] = True
        return stats
    except Exception as exc:
        print(f"❌ Error writing output file: {exc}")
        stats["success"] = False
        return stats


def print_statistics(stats: dict):
    """Print consolidation statistics."""
    print(f"\n" + "=" * 60)
    print("Consolidation Statistics:")
    print("=" * 60)
    print(f"Total files found:      {stats['total_files']}")
    print(f"Files processed:        {stats['processed_files']}")
    print(f"Files ignored:          {stats['ignored_files']}")
    print(f"Errors:                 {stats['error_count']}")
    print(f"Total content size:     {stats['total_size']:,} bytes ({stats['total_size']/1024/1024:.2f}MB)")
    print(f"Success:                {'✅ Yes' if stats['success'] else '❌ No'}")
    print("=" * 60)


def main():
    """Main function with command line argument support."""
    import argparse

    parser = argparse.ArgumentParser(description="Consolidate selected project files into one text file")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_FILE),
        help=f"Output file path (default: {DEFAULT_OUTPUT_FILE})",
    )
    parser.add_argument(
        "--file",
        dest="files",
        action="append",
        help="Optional file path to include. Repeat this option for multiple files.",
    )

    args = parser.parse_args()

    print("\n🔄 Starting file consolidation...")
    print(f"Output: {args.output}\n")

    stats = consolidate_files(args.output, args.files)
    print_statistics(stats)

    if stats["success"]:
        print("\n✅ Consolidation complete!")
        print(f"📄 Output file: {Path(args.output).resolve() if os.path.isabs(args.output) else (PROJECT_ROOT / args.output).resolve()}")
    else:
        print("\n❌ Consolidation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
