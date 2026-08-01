"""
Script to consolidate all frontend files into a single comprehensive file.
This script reads all the frontend file definitions and merges them into one output file.

Usage:
    python consolidate_frontend_files.py
    or with custom output path:
    python consolidate_frontend_files.py --output path/to/output.txt
"""

import os
from pathlib import Path
from datetime import datetime

# Import the frontend files data
from create_files_from_list import FILES_DATA

OUTPUT_FILE = "consolidated_frontend_files.txt"


def consolidate_frontend_files(output_path: str = OUTPUT_FILE) -> None:
    """
    Consolidate all frontend files into a single file.
    
    Args:
        output_path: Path where the consolidated file will be created
    """
    
    print(f"Consolidating frontend files...")
    print(f"Output file: {output_path}\n")
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_path)
    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    total_files = 0
    total_size = 0
    
    try:
        with open(output_path, 'w', encoding='utf-8') as outfile:
            # Write header
            outfile.write("=" * 80 + "\n")
            outfile.write("CONSOLIDATED FRONTEND FILES\n")
            outfile.write("=" * 80 + "\n")
            outfile.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outfile.write(f"Total files: {len(FILES_DATA)}\n")
            outfile.write("=" * 80 + "\n\n")
            
            # Write table of contents
            outfile.write("TABLE OF CONTENTS\n")
            outfile.write("-" * 80 + "\n")
            for i, file_path in enumerate(FILES_DATA.keys(), 1):
                outfile.write(f"{i:3d}. {file_path}\n")
            outfile.write("\n" + "=" * 80 + "\n\n")
            
            # Write each file
            for file_path, content in FILES_DATA.items():
                total_files += 1
                file_size = len(content.encode('utf-8'))
                total_size += file_size
                
                # Writing separator and file info
                outfile.write("─" * 80 + "\n")
                outfile.write(f"FILE: {file_path}\n")
                outfile.write(f"Size: {file_size} bytes\n")
                outfile.write("─" * 80 + "\n\n")
                
                # Write content
                outfile.write(content)
                outfile.write("\n\n")
                
                print(f"✅ Consolidated: {file_path} ({file_size} bytes)")
        
        # Print summary
        print(f"\n" + "=" * 60)
        print(f"Consolidation Complete!")
        print(f"=" * 60)
        print(f"Output file: {output_path}")
        print(f"Total files: {total_files}")
        print(f"Total size: {total_size:,} bytes ({total_size / 1024 / 1024:.2f} MB)")
        print(f"=" * 60)
        
    except Exception as e:
        print(f"❌ Error during consolidation: {str(e)}")
        raise


def create_index_file(output_path: str = "frontend_index.txt") -> None:
    """
    Create an index file with file structure and summaries.
    
    Args:
        output_path: Path where the index file will be created
    """
    
    print(f"\nCreating index file: {output_path}")
    
    try:
        with open(output_path, 'w', encoding='utf-8') as outfile:
            outfile.write("=" * 80 + "\n")
            outfile.write("FRONTEND FILES INDEX\n")
            outfile.write("=" * 80 + "\n\n")
            
            # Group files by category
            categories = {}
            for file_path in FILES_DATA.keys():
                parts = file_path.split('/')
                category = parts[0] if parts[0] else 'root'
                
                if category not in categories:
                    categories[category] = []
                categories[category].append(file_path)
            
            # Write categorized structure
            for category in sorted(categories.keys()):
                outfile.write(f"\n📁 {category.upper()}\n")
                outfile.write("-" * 40 + "\n")
                for file_path in sorted(categories[category]):
                    file_name = file_path.split('/')[-1]
                    file_size = len(FILES_DATA[file_path].encode('utf-8'))
                    outfile.write(f"  📄 {file_name:<40} ({file_size:>6} bytes)\n")
        
        print(f"✅ Index file created successfully")
        
    except Exception as e:
        print(f"❌ Error creating index file: {str(e)}")


if __name__ == "__main__":
    import sys
    
    output_file = OUTPUT_FILE
    
    # Check for custom output path argument
    if len(sys.argv) > 1:
        if sys.argv[1] == '--output' and len(sys.argv) > 2:
            output_file = sys.argv[2]
        else:
            output_file = sys.argv[1]
    
    print("Frontend File Consolidation Tool")
    print("=" * 60)
    print(f"Total files to consolidate: {len(FILES_DATA)}")
    print("=" * 60)
    
    # Consolidate files
    consolidate_frontend_files(output_file)
    
    # Create index file
    index_file = output_file.replace('.txt', '_index.txt')
    create_index_file(index_file)
    
    print(f"\n✨ All done! Check the output files:")
    print(f"   - {output_file}")
    print(f"   - {index_file}")
