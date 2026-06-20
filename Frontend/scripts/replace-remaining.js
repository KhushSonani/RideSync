const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../constants')
];

const REPLACEMENTS = [
    // Backgrounds
    { regex: /bg-black(\/[0-9\[\]\.]+)?/g, replace: 'bg-foreground$1' },
    { regex: /bg-white(\/[0-9\[\]\.]+)?/g, replace: 'bg-foreground$1' },
    
    // Text
    { regex: /text-\[\#071018\]/g, replace: 'text-background' },
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
console.log('Done fixing remaining colors!');
