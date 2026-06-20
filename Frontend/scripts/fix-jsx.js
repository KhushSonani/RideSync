const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../constants')
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

    // We look for any prop that is assigned as = (colorScheme === 'light' ? '...' : '...')
    // Note: the original replacement replaced "var(...)" with (colorScheme...)
    // So if the code was: color="var(--color-primary)"
    // It became: color=(colorScheme === 'light' ? '#0D9488' : '#11E0C5')
    // We want to change it to: color={colorScheme === 'light' ? '#0D9488' : '#11E0C5'}

    content = content.replace(/=(\(colorScheme === 'light' \? '[^']+' : '[^']+'\))/g, '={$1}');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed JSX: ${path.relative(__dirname, filePath)}`);
    }
}

for (const dir of DIRECTORIES) {
    walk(dir);
}
console.log('Done fixing JSX!');
