const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../constants')
];

const REPLACEMENTS = [
    { regex: /rgba\(7,\s*11,\s*18,\s*[0-9.]+\)/g, replace: 'var(--color-background)' },
    { regex: /rgba\(13,\s*20,\s*32,\s*[0-9.]+\)/g, replace: 'var(--color-card)' },
    { regex: /rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, replace: 'var(--color-border)' },
    { regex: /rgba\(255,\s*255,\s*255,\s*0\.9\)/g, replace: 'var(--color-foreground)' }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const { regex, replace } of REPLACEMENTS) {
        content = content.replace(regex, replace);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    }
}

for (const dir of DIRECTORIES) {
    walk(dir);
}
console.log('Done fixing inline rgbas!');
