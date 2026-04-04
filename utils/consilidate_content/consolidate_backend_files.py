"""
Script to consolidate all backend files into a single comprehensive file.
This script reads all the backend file definitions and merges them into one output file.

Usage:
    python consolidate_backend_files.py
    or with custom output path:
    python consolidate_backend_files.py --output path/to/output.txt
"""

import os
from pathlib import Path
from datetime import datetime

# Import the backend files data
from create_backend_files import BACKEND_FILES_DATA

OUTPUT_FILE = "consolidated_backend_files.txt"


def consolidate_backend_files(output_path: str = OUTPUT_FILE) -> None:
    """
    Consolidate all backend files into a single file.
    
    Args:
        output_path: Path where the consolidated file will be created
    """
    
    print(f"Consolidating backend files...")
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
            outfile.write("CONSOLIDATED BACKEND FILES\n")
            outfile.write("=" * 80 + "\n")
            outfile.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outfile.write(f"Total files: {len(BACKEND_FILES_DATA)}\n")
            outfile.write("=" * 80 + "\n\n")
            
            # Write table of contents
            outfile.write("TABLE OF CONTENTS\n")
            outfile.write("-" * 80 + "\n")
            for i, file_path in enumerate(BACKEND_FILES_DATA.keys(), 1):
                outfile.write(f"{i:3d}. {file_path}\n")
            outfile.write("\n" + "=" * 80 + "\n\n")
            
            # Write each file
            for file_path, content in BACKEND_FILES_DATA.items():
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


def create_index_file(output_path: str = "backend_index.txt") -> None:
    """
    Create an index file with file structure and summaries.
    
    Args:
        output_path: Path where the index file will be created
    """
    
    print(f"\nCreating index file: {output_path}")
    
    try:
        with open(output_path, 'w', encoding='utf-8') as outfile:
            outfile.write("=" * 80 + "\n")
            outfile.write("BACKEND FILES INDEX\n")
            outfile.write("=" * 80 + "\n\n")
            
            # Group files by category
            categories = {}
            for file_path in BACKEND_FILES_DATA.keys():
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
                    file_size = len(BACKEND_FILES_DATA[file_path].encode('utf-8'))
                    outfile.write(f"  📄 {file_name:<40} ({file_size:>6} bytes)\n")
            
            # Add section summary
            outfile.write("\n\n" + "=" * 80 + "\n")
            outfile.write("SECTION SUMMARY\n")
            outfile.write("=" * 80 + "\n\n")
            
            for category in sorted(categories.keys()):
                files = categories[category]
                total_size = sum(len(BACKEND_FILES_DATA[f].encode('utf-8')) for f in files)
                outfile.write(f"{category.upper():20} {len(files):3d} files  {total_size:>8,} bytes\n")
        
        print(f"✅ Index file created successfully")
        
    except Exception as e:
        print(f"❌ Error creating index file: {str(e)}")


def create_structure_guide(output_path: str = "backend_structure_guide.txt") -> None:
    """
    Create a guide explaining the backend structure.
    
    Args:
        output_path: Path where the structure guide will be created
    """
    
    print(f"\nCreating structure guide: {output_path}")
    
    try:
        with open(output_path, 'w', encoding='utf-8') as outfile:
            outfile.write("=" * 80 + "\n")
            outfile.write("BACKEND STRUCTURE GUIDE\n")
            outfile.write("=" * 80 + "\n\n")
            
            outfile.write("FOLDER DESCRIPTIONS\n")
            outfile.write("-" * 80 + "\n\n")
            
            outfile.write("📁 ROUTER FOLDER\n")
            outfile.write("   Location: ./router/\n")
            outfile.write("   Purpose: FastAPI route handlers and endpoint definitions\n")
            outfile.write("   Contents:\n")
            outfile.write("      - admin_create_user.py: Admin user creation endpoints\n")
            outfile.write("      - students.py: Student CRUD operations\n")
            outfile.write("      - teacher_names.py: Teacher management endpoints\n")
            outfile.write("      - class_names.py: Class setup and management\n")
            outfile.write("      - attendance_time.py: Time slot management\n")
            outfile.write("      - mark_attendance.py: Attendance recording\n")
            outfile.write("      - fee.py, income.py, expense.py: Financial operations\n")
            outfile.write("      - dashboard.py: Dashboard data endpoints\n\n")
            
            outfile.write("📁 SCHEMAS FOLDER\n")
            outfile.write("   Location: ./schemas/\n")
            outfile.write("   Purpose: Pydantic validation models and data schemas\n")
            outfile.write("   Contents:\n")
            outfile.write("      - *_model.py: Request/Response schemas for each entity\n")
            outfile.write("      - Includes: Create, Update, and Response variants\n")
            outfile.write("      - Features: Type hints, validation rules, examples\n\n")
            
            outfile.write("📁 USER FOLDER\n")
            outfile.write("   Location: ./user/\n")
            outfile.write("   Purpose: User management, authentication, and services\n")
            outfile.write("   Contents:\n")
            outfile.write("      - user_models.py: SQLAlchemy User model definition\n")
            outfile.write("      - user_crud.py: Database CRUD operations for users\n")
            outfile.write("      - user_router.py: User-related endpoints\n")
            outfile.write("      - services.py: Business logic and authentication\n")
            outfile.write("      - settings.py: Configuration and environment settings\n\n")
            
            outfile.write("\n" + "=" * 80 + "\n")
            outfile.write("INTEGRATION NOTES\n")
            outfile.write("=" * 80 + "\n\n")
            
            outfile.write("1. Router files should be imported in main.py\n")
            outfile.write("2. Schemas are used by router endpoints for validation\n")
            outfile.write("3. User module handles authentication and authorization\n")
            outfile.write("4. All routers use Depends(get_db) for database sessions\n")
            outfile.write("5. Services contain business logic separate from routes\n\n")
            
            outfile.write("=" * 80 + "\n")
        
        print(f"✅ Structure guide created successfully")
        
    except Exception as e:
        print(f"❌ Error creating structure guide: {str(e)}")


if __name__ == "__main__":
    import sys
    
    output_file = OUTPUT_FILE
    
    # Check for custom output path argument
    if len(sys.argv) > 1:
        if sys.argv[1] == '--output' and len(sys.argv) > 2:
            output_file = sys.argv[2]
        else:
            output_file = sys.argv[1]
    
    print("Backend File Consolidation Tool")
    print("=" * 60)
    print(f"Total files to consolidate: {len(BACKEND_FILES_DATA)}")
    print("=" * 60)
    
    # Consolidate files
    consolidate_backend_files(output_file)
    
    # Create index file
    index_file = output_file.replace('.txt', '_index.txt')
    create_index_file(index_file)
    
    # Create structure guide
    guide_file = output_file.replace('.txt', '_structure_guide.txt')
    create_structure_guide(guide_file)
    
    print(f"\n✨ All done! Check the output files:")
    print(f"   - {output_file}")
    print(f"   - {index_file}")
    print(f"   - {guide_file}")
