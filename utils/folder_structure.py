import os

IGNORE_FOLDERS = {".venv", "__pycache__", ".git", ".next", "node_modules"}

def get_all_files(start_path):
    """Recursively get all files in a directory"""
    all_files = []
    
    for root, dirs, files in os.walk(start_path):
        # Remove ignored folders from dirs to prevent descending into them
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]
        
        for file in files:
            file_path = os.path.join(root, file)
            # Store relative path from start_path
            rel_path = os.path.relpath(file_path, start_path)
            all_files.append(rel_path)
    
    return sorted(all_files)

# Get all files in frontend/src
src_path = "./frontend/src"

if os.path.exists(src_path):
    files = get_all_files(src_path)
    print(f"All files in {src_path}:\n")
    for file in files:
        print(file)
    print(f"\nTotal files: {len(files)}")
else:
    print(f"Error: {src_path} does not exist")


# import os
# import sys
# print("Current directory:", os.getcwd())
# print("Directory contents:", os.listdir('.'))
# print("Parent contents:", os.listdir('..'))



# print("=== DEBUG INFO ===")
# print("Current dir:", os.getcwd())
# print("Python path:", sys.path)
# print("Files in current dir:", os.listdir('.'))
# if 'api' in os.listdir('.'):
#     print("✓ 'api' directory exists")
# else:
#     print("✗ 'api' directory NOT found!")
# print("==================")

# # Debug for deployment
# print("=== NORTHFLANK DEBUG ===")
# print("Working directory:", os.getcwd())
# print("Python path:", sys.path)
# print("Listing current directory:", os.listdir('.'))
# print("=======================")
