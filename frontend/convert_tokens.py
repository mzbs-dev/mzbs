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

replacements = [
    ('bg-white', 'bg-card'),
    ('bg-gray-50', 'bg-muted'),
    ('bg-gray-100', 'bg-muted'),
    ('bg-gray-200', 'bg-muted'),
    ('border-gray-200', 'border-border'),
    ('border-gray-300', 'border-border'),
    ('border-gray-400', 'border-border'),
    ('dark:border-gray-700', 'dark:border-border'),
    ('dark:border-gray-800', 'dark:border-border'),
    ('text-gray-400', 'text-muted-foreground'),
    ('text-gray-500', 'text-muted-foreground'),
    ('text-gray-600', 'text-muted-foreground'),
    ('text-gray-700', 'text-foreground'),
    ('text-gray-900', 'text-foreground'),
    ('dark:text-gray-100', 'dark:text-foreground'),
    ('dark:text-gray-300', 'dark:text-foreground'),
    ('dark:text-gray-400', 'dark:text-muted-foreground'),
    ('dark:text-gray-200', 'dark:text-foreground'),
    ('bg-slate-50', 'bg-muted'),
    ('bg-slate-900', 'bg-card'),
    ('bg-slate-800', 'bg-card'),
    ('border-slate-200', 'border-border'),
    ('border-slate-300', 'border-border'),
    ('border-slate-700', 'border-border'),
    ('border-slate-800', 'border-border'),
    ('text-slate-400', 'text-muted-foreground'),
    ('text-slate-500', 'text-muted-foreground'),
    ('text-slate-600', 'text-muted-foreground'),
    ('text-slate-900', 'text-foreground'),
    ('dark:bg-slate-900', 'dark:bg-card'),
    ('dark:bg-slate-800', 'dark:bg-card'),
    ('dark:text-slate-400', 'dark:text-muted-foreground'),
    ('dark:text-slate-500', 'dark:text-muted-foreground'),
    ('dark:text-slate-300', 'dark:text-foreground'),
    ('dark:text-slate-100', 'dark:text-foreground'),
    ('bg-blue-600', 'bg-primary'),
    ('hover:bg-blue-700', 'hover:bg-primary/90'),
    ('hover:bg-blue-50', 'hover:bg-primary/10'),
    ('bg-blue-50', 'bg-primary/10'),
    ('text-blue-600', 'text-primary'),
    ('text-blue-700', 'text-primary'),
    ('border-blue-200', 'border-primary/20'),
    ('border-blue-400', 'border-primary'),
    ('bg-red-50', 'bg-destructive/10'),
    ('text-red-600', 'text-destructive'),
    ('text-red-700', 'text-destructive'),
    ('border-red-200', 'border-destructive/20'),
    ('bg-green-100', 'bg-primary/10'),
    ('text-green-700', 'text-primary'),
    ('bg-amber-50', 'bg-secondary'),
    ('text-amber-700', 'text-foreground'),
    ('bg-orange-50', 'bg-secondary'),
    ('text-orange-700', 'text-foreground'),
    ('bg-emerald-50', 'bg-primary/10'),
    ('text-emerald-700', 'text-primary'),
    ('border-emerald-200', 'border-primary/20'),
    ('bg-emerald-500', 'bg-primary'),
    ('bg-purple-200', 'bg-secondary'),
    ('border-purple-200', 'border-border'),
    ('border-purple-300', 'border-border'),
    ('text-purple-600', 'text-primary'),
    ('bg-indigo-300', 'bg-secondary'),
    ('focus:ring-indigo-300', 'focus:ring-primary/20'),
    ('bg-cyan-600', 'bg-primary'),
    ('to-cyan-600', 'to-primary'),
    ('from-blue-600', 'from-primary'),
    ('hover:from-blue-700', 'hover:from-primary/90'),
    ('hover:to-cyan-700', 'hover:to-primary/90'),
    ('text-cyan-600', 'text-primary'),
    ('text-cyan-700', 'text-primary'),
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

print(f"Updated {count} files")
