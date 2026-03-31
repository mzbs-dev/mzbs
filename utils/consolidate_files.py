"""
Script to copy all existing file content from a directory into a single consolidated file.
Reads all files recursively and combines them into one output file.

Usage:
    python consolidate_files.py
    
    Or with custom paths:
    python consolidate_files.py --source ./frontend/src --output ./consolidated_output.txt
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configuration
DEFAULT_SOURCE_DIR = "./frontend/src"
DEFAULT_OUTPUT_FILE = "./consolidated_files_content.txt"
IGNORE_FOLDERS = {".venv", "__pycache__", ".git", ".next", "node_modules", ".vercel"}
IGNORE_EXTENSIONS = {".woff", ".woff2", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg"}


def should_ignore(file_path: str) -> bool:
    """Check if file should be ignored based on extension or folder"""
    # Check if any ignored folder is in the path
    for ignore_folder in IGNORE_FOLDERS:
        if ignore_folder in file_path.split(os.sep):
            return True
    
    # Check file extension
    _, ext = os.path.splitext(file_path)
    if ext.lower() in IGNORE_EXTENSIONS:
        return True
    
    return False


def read_file_safe(file_path: str, max_size: int = 1024*1024) -> str:
    """
    Safely read file content with error handling.
    
    Args:
        file_path: Path to file to read
        max_size: Maximum file size to read (1MB default)
    
    Returns:
        File content as string, or error message if reading fails
    """
    try:
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size > max_size:
            return f"[FILE TOO LARGE: {file_size/1024/1024:.2f}MB - skipped]"
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        return f"[ERROR READING FILE: {str(e)}]"


def consolidate_files(source_dir: str, output_file: str) -> dict:
    """
    Consolidate all file contents into a single file.
    
    Args:
        source_dir: Source directory to read files from
        output_file: Output file path
    
    Returns:
        Dictionary with statistics
    """
    if not os.path.exists(source_dir):
        print(f"❌ Error: Source directory '{source_dir}' does not exist!")
        return {"success": False, "total_files": 0}
    
    stats = {
        "total_files": 0,
        "processed_files": 0,
        "ignored_files": 0,
        "error_count": 0,
        "total_size": 0,
    }
    
    # Collect all files
    all_files = []
    for root, dirs, files in os.walk(source_dir):
        # Filter out ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        
        for file in sorted(files):
            file_path = os.path.join(root, file)
            stats["total_files"] += 1
            
            # Check if file should be ignored
            if should_ignore(file_path):
                stats["ignored_files"] += 1
                continue
            
            all_files.append(file_path)
    
    # Write consolidated file
    try:
        with open(output_file, 'w', encoding='utf-8') as outf:
            # Write header
            outf.write("=" * 80 + "\n")
            outf.write(f"CONSOLIDATED FILE CONTENT\n")
            outf.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outf.write(f"Source: {os.path.abspath(source_dir)}\n")
            outf.write(f"Total Files: {len(all_files)}\n")
            outf.write("=" * 80 + "\n\n")
            
            # Write each file's content
            for idx, file_path in enumerate(all_files, 1):
                rel_path = os.path.relpath(file_path, source_dir)
                
                try:
                    content = read_file_safe(file_path)
                    file_size = os.path.getsize(file_path)
                    stats["total_size"] += file_size
                    
                    # Write file header
                    outf.write("\n" + "-" * 80 + "\n")
                    outf.write(f"FILE [{idx}/{len(all_files)}]: {rel_path}\n")
                    outf.write(f"Size: {file_size:,} bytes\n")
                    outf.write("-" * 80 + "\n")
                    
                    # Write file content
                    outf.write(content)
                    
                    if not content.endswith('\n'):
                        outf.write('\n')
                    
                    stats["processed_files"] += 1
                    print(f"✅ [{idx}/{len(all_files)}] Processed: {rel_path}")
                    
                except Exception as e:
                    stats["error_count"] += 1
                    outf.write(f"\n[ERROR PROCESSING FILE: {str(e)}]\n")
                    print(f"❌ Error processing: {rel_path}")
            
            # Write footer
            outf.write("\n" + "=" * 80 + "\n")
            outf.write(f"END OF CONSOLIDATED CONTENT\n")
            outf.write(f"Total files processed: {stats['processed_files']}\n")
            outf.write(f"Total size: {stats['total_size']:,} bytes ({stats['total_size']/1024/1024:.2f}MB)\n")
            outf.write("=" * 80 + "\n")
        
        stats["success"] = True
        return stats
    
    except Exception as e:
        print(f"❌ Error writing output file: {str(e)}")
        stats["success"] = False
        return stats


def print_statistics(stats: dict):
    """Print consolidation statistics"""
    print(f"\n" + "=" * 60)
    print(f"Consolidation Statistics:")
    print(f"=" * 60)
    print(f"Total files found:      {stats['total_files']}")
    print(f"Files processed:        {stats['processed_files']}")
    print(f"Files ignored:          {stats['ignored_files']}")
    print(f"Errors:                 {stats['error_count']}")
    print(f"Total content size:     {stats['total_size']:,} bytes ({stats['total_size']/1024/1024:.2f}MB)")
    print(f"Success:                {'✅ Yes' if stats['success'] else '❌ No'}")
    print(f"=" * 60)


def main():
    """Main function with command line argument support"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Consolidate all files from a directory into a single file"
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE_DIR,
        help=f"Source directory (default: {DEFAULT_SOURCE_DIR})"
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_FILE,
        help=f"Output file path (default: {DEFAULT_OUTPUT_FILE})"
    )
    
    args = parser.parse_args()
    
    print(f"\n🔄 Starting file consolidation...")
    print(f"Source: {args.source}")
    print(f"Output: {args.output}\n")
    
    stats = consolidate_files(args.source, args.output)
    print_statistics(stats)
    
    if stats['success']:
        print(f"\n✅ Consolidation complete!")
        print(f"📄 Output file: {os.path.abspath(args.output)}")
    else:
        print(f"\n❌ Consolidation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
