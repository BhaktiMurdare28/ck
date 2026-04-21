import glob

# We will map the currently used blue colors to a beautiful violet theme
color_map = {
    # HEX mappings
    '3B82F6': '8B5CF6', # Main blue to Main violet
    '3b82f6': '8b5cf6',
    '2563EB': '7C3AED', # Dark blue to Dark violet
    '2563eb': '7c3aed',
    '93C5FD': 'A78BFA', # Light blue to Light violet
    '93c5fd': 'a78bfa',
    '1D4ED8': '6D28D9', # Very dark blue
    '1d4ed8': '6d28d9',
    '60A5FA': 'A78BFA', # Lighter blue to Light violet
    '60a5fa': 'a78bfa',

    # RGB mappings
    # rgba(59, 130, 246, ...)
    '59, 130, 246': '139, 92, 246',
    '59,130,246': '139,92,246',
    # rgba(37, 99, 235, ...)
    '37, 99, 235': '124, 58, 237',
    '37,99,235': '124,58,237'
}

files = glob.glob('*.html') + glob.glob('*.css') + glob.glob('*.js')

for filename in files:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    for old_color, new_color in color_map.items():
        content = content.replace(old_color, new_color)

    if content != original:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
