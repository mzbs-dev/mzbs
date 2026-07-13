"""
Script to consolidate all files from the schemas folder into a single .txt file
inside the docs folder.

Usage:
    python utils/consilidate_content/consolidate_schemas_files.py
    python utils/consilidate_content/consolidate_schemas_files.py --output docs/consolidated_schemas_files.txt
"""

import sys
from datetime import datetime
from pathlib import Path


def consolidate_schemas_files(output_path: str | None = None) -> Path:
    """Combine all schema files into one text document."""
    root_dir = Path(__file__).resolve().parents[2]
    schemas_dir = root_dir / "schemas"

    if not schemas_dir.exists():
        raise FileNotFoundError(f"Schemas directory not found: {schemas_dir}")

    if output_path is None:
        output_path = root_dir / "docs" / "consolidated_schemas_files.txt"
    else:
        output_path = Path(output_path)
        if not output_path.is_absolute():
            output_path = root_dir / output_path

    output_path.parent.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [path for path in schemas_dir.rglob("*") if path.is_file()],
        key=lambda p: p.relative_to(root_dir).as_posix(),
    )

    with output_path.open("w", encoding="utf-8") as outfile:
        outfile.write("=" * 80 + "\n")
        outfile.write("CONSOLIDATED SCHEMAS FILES\n")
        outfile.write("=" * 80 + "\n")
        outfile.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outfile.write(f"Source folder: {schemas_dir.relative_to(root_dir).as_posix()}\n")
        outfile.write(f"Total files: {len(files)}\n")
        outfile.write("=" * 80 + "\n\n")

        for file_path in files:
            rel_path = file_path.relative_to(root_dir).as_posix()
            try:
                content = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = file_path.read_text(encoding="utf-8", errors="replace")

            outfile.write("─" * 80 + "\n")
            outfile.write(f"FILE: {rel_path}\n")
            outfile.write(f"Size: {file_path.stat().st_size} bytes\n")
            outfile.write("─" * 80 + "\n\n")
            outfile.write(content)
            outfile.write("\n\n")

    print(f"✅ Consolidated schemas files into: {output_path}")
    print(f"📄 Total files included: {len(files)}")
    return output_path


if __name__ == "__main__":
    output_arg = None
    if len(sys.argv) > 1:
        if sys.argv[1] == "--output" and len(sys.argv) > 2:
            output_arg = sys.argv[2]
        else:
            output_arg = sys.argv[1]

    consolidate_schemas_files(output_arg)
