import glob
import re

emoji_map = {
    '‹': '<i class="fa-solid fa-chevron-left"></i>',
    '🏗': '<i class="fa-solid fa-building"></i>',
    '🏠': '<i class="fa-solid fa-house"></i>',
    '📋': '<i class="fa-solid fa-clipboard-list"></i>',
    '📊': '<i class="fa-solid fa-chart-line"></i>',
    '👷': '<i class="fa-solid fa-helmet-safety"></i>',
    '💰': '<i class="fa-solid fa-sack-dollar"></i>',
    '📜': '<i class="fa-solid fa-scroll"></i>',
    '👥': '<i class="fa-solid fa-users"></i>',
    '🔔': '<i class="fa-solid fa-bell"></i>',
    '🚪': '<i class="fa-solid fa-right-from-bracket"></i>',
    '☰': '<i class="fa-solid fa-bars"></i>',
    '🌙': '<i class="fa-solid fa-moon"></i>',
    '📈': '<i class="fa-solid fa-arrow-trend-up"></i>',
    '⚠': '<i class="fa-solid fa-triangle-exclamation"></i>',
    '⚠️': '<i class="fa-solid fa-triangle-exclamation"></i>',
    '🎯': '<i class="fa-solid fa-bullseye"></i>',
    '✅': '<i class="fa-solid fa-circle-check"></i>',
    '❌': '<i class="fa-solid fa-circle-xmark"></i>',
    '✉️': '<i class="fa-solid fa-envelope"></i>',
    '📣': '<i class="fa-solid fa-bullhorn"></i>',
    '📁': '<i class="fa-solid fa-folder-open"></i>',
    '⏳': '<i class="fa-solid fa-hourglass-half"></i>',
    '✕': '<i class="fa-solid fa-xmark"></i>',
    '➕': '<i class="fa-solid fa-plus"></i>',
    '✏': '<i class="fa-solid fa-pen"></i>',
    '📍': '<i class="fa-solid fa-location-dot"></i>',
    '📅': '<i class="fa-solid fa-calendar-days"></i>',
    '💼': '<i class="fa-solid fa-briefcase"></i>',
    '🧱': '<i class="fa-solid fa-trowel-bricks"></i>',
    '🧾': '<i class="fa-solid fa-receipt"></i>',
    '📸': '<i class="fa-solid fa-camera"></i>',
    '🖼': '<i class="fa-solid fa-image"></i>',
    '💱': '<i class="fa-solid fa-money-bill-transfer"></i>',
    '📝': '<i class="fa-solid fa-file-pen"></i>',
    '📐': '<i class="fa-solid fa-ruler-combined"></i>',
    '📦': '<i class="fa-solid fa-box"></i>',
    '☀': '<i class="fa-solid fa-sun"></i>',
    '⛅': '<i class="fa-solid fa-cloud-sun"></i>',
    '🌧': '<i class="fa-solid fa-cloud-rain"></i>',
    '💨': '<i class="fa-solid fa-wind"></i>',
    '🌫': '<i class="fa-solid fa-smog"></i>',
    '🔒': '<i class="fa-solid fa-lock"></i>'
}

files = glob.glob('*.html') + glob.glob('*.js')

for filename in files:
    if filename == 'replace.py': continue
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace emojis
    for emoji, icon in emoji_map.items():
        content = content.replace(emoji, icon)

    # Insert FA link into head if not exists
    if filename.endswith('.html'):
        if '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' not in content:
            content = content.replace('<link rel="stylesheet" href="main.css">', 
                                      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n  <link rel="stylesheet" href="main.css">')
            
            # For cases where it might not match exactly or main.css isn't there
            if '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' not in content:
                 content = content.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n</head>')

    if content != original:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
