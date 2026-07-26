from pathlib import Path

base = Path('src/components')
roots = [
    'Attendance', 'Exam', 'Expense', 'Income', 'Staff', 'ClassName', 'ClassSubject',
    'ClassTiming', 'teacher', 'Fees', 'User'
]
files = []
for root in roots:
    folder = base / root
    if folder.exists():
        files.extend([p for p in folder.rglob('*') if p.is_file() and p.suffix in {'.tsx', '.ts'}])

# Second pass: more aggressive replacements for remaining tokens
replacements = [
    # Dark mode neutrals
    ('dark:bg-gray-800', 'dark:bg-card'),
    ('dark:bg-gray-600', 'dark:bg-card'),
    ('dark:text-white', 'dark:text-foreground'),
    ('dark:border-gray-600', 'dark:border-border'),
    ('dark:hover-bg-gray-800/50', 'dark:hover:bg-card/50'),
    ('dark:border-gray-100', 'dark:border-border'),
    ('dark:text-gray-200', 'dark:text-foreground'),
    ('dark:text-gray-100', 'dark:text-foreground'),
    # Remaining slate/gray
    ('bg-slate-100', 'bg-muted'),
    ('bg-slate-100/70', 'bg-muted/70'),
    ('text-slate-200', 'text-foreground'),
    ('text-slate-700', 'text-foreground'),
    ('text-gray-800', 'text-foreground'),
    ('text-gray-100', 'text-muted-foreground'),
    ('border-slate-100', 'border-border'),
    ('hover:bg-purple-50', 'hover:bg-secondary'),
    ('bg-purple-50', 'bg-secondary'),
    ('hover:bg-slate-700/50', 'hover:bg-card/50'),
    ('focus:ring-blue-100', 'focus:ring-primary/20'),
    ('focus:ring-purple-200', 'focus:ring-secondary/20'),
    ('dark:bg-slate-950', 'dark:bg-background'),
    ('dark:bg-slate-950/70', 'dark:bg-background/70'),
    ('dark:bg-neutral-800', 'dark:bg-card'),
    ('dark:bg-neutral-900', 'dark:bg-card'),
    ('dark:focus:ring-blue-950/40', 'dark:focus:ring-primary/20'),
    ('dark:focus:border-blue-500', 'dark:focus:border-primary'),
    ('dark:border-gray-700', 'dark:border-border'),
    ('dark:text-muted-foreground dark:hover:text-gray-200', 'dark:text-muted-foreground dark:hover:text-foreground'),
]

count = 0
for file in files:
    try:
        text = file.read_text(encoding='utf-8')
        original = text
        for old, new in replacements:
            text = text.replace(old, new)
        if text != original:
            file.write_text(text, encoding='utf-8')
            count += 1
    except Exception as e:
        print(f"Error processing {file}: {e}")

print(f"Updated {count} files in second pass")
