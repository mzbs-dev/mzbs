"""
Master Consolidation Script
Consolidates both frontend and backend files into separate comprehensive output files.

Usage:
    python consolidate_all.py              (default paths)
    python consolidate_all.py --output-dir ./consolidated/    (custom directory)
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Import consolidation functions
from consolidate_frontend_files import consolidate_frontend_files, create_index_file as create_frontend_index
from consolidate_backend_files import (
    consolidate_backend_files,
    create_index_file as create_backend_index,
    create_structure_guide
)


def create_readme(output_dir: str) -> None:
    """Create a README file explaining the consolidated outputs."""
    
    readme_path = os.path.join(output_dir, "README.md")
    
    readme_content = """# Consolidated Files Documentation

## Overview

This directory contains consolidated versions of frontend and backend files from the MMS (School Management System) project.

## Files Included

### Frontend Consolidation
- **consolidated_frontend_files.txt** - All frontend files combined (103 files)
  - API clients
  - React components
  - Pages and layouts
  - Utilities and hooks
  - UI components
  - Context and models

- **consolidated_frontend_files_index.txt** - Organized index with file structure and sizes

### Backend Consolidation
- **consolidated_backend_files.txt** - All backend files combined (43 files)
  - FastAPI routers
  - Pydantic schemas
  - User management
  - CRUD operations
  - Authentication services

- **consolidated_backend_files_index.txt** - Organized index with file structure

- **consolidated_backend_files_structure_guide.txt** - Detailed guide for backend architecture

## Generation Information

- Generated on: {datetime}
- Frontend files: 103
- Backend files: 43
- Total files consolidated: 146

## How to Use

1. **For Documentation:** Use the index files (.txt) for quick reference of what's included
2. **For Code Review:** Use the consolidated files for comprehensive review of module
3. **For Backup:** These files serve as complete snapshots of project structure
4. **For Reference:** Use the structure guide to understand backend organization

## File Structure

### Frontend Architecture
```
frontend/src/
├── api/          - API client functions
├── app/          - Next.js pages and layouts
├── components/   - React components
├── context/      - Context providers
├── hooks/        - Custom React hooks
├── libs/         - Utility functions
├── models/       - TypeScript interfaces
└── utils/        - Helper functions
```

### Backend Architecture
```
backend/
├── router/       - FastAPI route handlers
├── schemas/      - Pydantic validation models
└── user/         - User management module
```

## Quick Stats

### Frontend
- Total size: ~ {frontend_size}
- Categories: API, App, Components, UI, Context, Hooks, Libs, Models, Utils
- File types: .tsx, .ts, .css

### Backend
- Total size: ~ {backend_size}
- Categories: Router, Schemas, User
- File types: .py
- Uses: FastAPI, SQLAlchemy, Pydantic

## Notes

- Original source files remain unchanged
- These are read-only consolidated versions
- Use for reference, documentation, and code review purposes
- For development, refer to individual source files

## Generated Using

- Script: consolidate_all.py
- Frontend: consolidate_frontend_files.py
- Backend: consolidate_backend_files.py
"""
    
    try:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        print(f"✅ README created: {readme_path}")
    except Exception as e:
        print(f"❌ Error creating README: {str(e)}")


def main():
    """Main consolidation function."""
    
    print("\n" + "=" * 80)
    print("MASTER FILE CONSOLIDATION TOOL")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Parse arguments
    output_dir = "./"
    if len(sys.argv) > 1:
        if sys.argv[1] == '--output-dir' and len(sys.argv) > 2:
            output_dir = sys.argv[2]
        else:
            output_dir = sys.argv[1]
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Define output paths
    frontend_file = os.path.join(output_dir, "consolidated_frontend_files.txt")
    frontend_index = os.path.join(output_dir, "consolidated_frontend_files_index.txt")
    backend_file = os.path.join(output_dir, "consolidated_backend_files.txt")
    backend_index = os.path.join(output_dir, "consolidated_backend_files_index.txt")
    backend_guide = os.path.join(output_dir, "consolidated_backend_files_structure_guide.txt")
    
    print("STEP 1: Consolidating Frontend Files")
    print("-" * 80)
    try:
        consolidate_frontend_files(frontend_file)
        create_frontend_index(frontend_index)
    except Exception as e:
        print(f"❌ Frontend consolidation failed: {str(e)}")
        return False
    
    print("\n" + "=" * 80)
    print("STEP 2: Consolidating Backend Files")
    print("-" * 80)
    try:
        consolidate_backend_files(backend_file)
        create_backend_index(backend_index)
        create_structure_guide(backend_guide)
    except Exception as e:
        print(f"❌ Backend consolidation failed: {str(e)}")
        return False
    
    print("\n" + "=" * 80)
    print("STEP 3: Creating Documentation")
    print("-" * 80)
    
    # Calculate file sizes
    try:
        frontend_size = os.path.getsize(frontend_file) / (1024 * 1024)
        backend_size = os.path.getsize(backend_file) / (1024 * 1024)
    except:
        frontend_size = 0
        backend_size = 0
    
    # Create README
    create_readme(output_dir)
    
    # Final summary
    print("\n" + "=" * 80)
    print("CONSOLIDATION COMPLETE!")
    print("=" * 80)
    print(f"\nOutput Directory: {os.path.abspath(output_dir)}\n")
    print("Files Created:")
    print(f"  ✅ {os.path.relpath(frontend_file)} ({frontend_size:.2f} MB)")
    print(f"  ✅ {os.path.relpath(frontend_index)}")
    print(f"  ✅ {os.path.relpath(backend_file)} ({backend_size:.2f} MB)")
    print(f"  ✅ {os.path.relpath(backend_index)}")
    print(f"  ✅ {os.path.relpath(backend_guide)}")
    print(f"  ✅ {os.path.relpath(os.path.join(output_dir, 'README.md'))}")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80 + "\n")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
