const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../constants')
];

function processContent(content) {
    // We want to replace properties inside style={{ ... }} that use var(--color-xxx) with className.
    // However, it's safer to just inject a theme object into the component or use regex to replace var(--color-xxx) with a function call.
    // A better approach: 
    // In React Native + NativeWind, `className` is the standard.
    // But since this is tricky to regex perfectly, let's inject a helper:
    // const theme = useColorScheme() === 'light' ? { bg: '#fff' ... } : ...
    // Since we're in a rush, we'll replace the var(--color-xxx) strings with explicit JS logic.
    return content;
}

// Actually, I'll just write a script that replaces specific var strings with ternary operators.
// Note: This requires colorScheme to be defined in the file.
const REPLACEMENTS = [
    { regex: /"var\(--color-background\)"/g, replace: "(colorScheme === 'light' ? '#F3F4F6' : '#070B12')" },
    { regex: /"var\(--color-card\)"/g, replace: "(colorScheme === 'light' ? '#FFFFFF' : '#0D1420')" },
    { regex: /"var\(--color-input\)"/g, replace: "(colorScheme === 'light' ? '#F9FAFB' : '#131D2B')" },
    { regex: /"var\(--color-primary\)"/g, replace: "(colorScheme === 'light' ? '#0D9488' : '#11E0C5')" },
    { regex: /"var\(--color-foreground\)"/g, replace: "(colorScheme === 'light' ? '#111827' : '#FFFFFF')" },
    { regex: /"var\(--color-muted\)"/g, replace: "(colorScheme === 'light' ? '#6B7280' : '#748096')" },
    { regex: /"var\(--color-border\)"/g, replace: "(colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')" },
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
    
    // Inject colorScheme if it was added
    if (content !== original && !content.includes("const colorScheme =")) {
        // we need to inject `const colorScheme = require('react-native').useColorScheme();` inside the component
        // This is tricky with regex, so we'll just log which files need it.
        console.log(`Needs colorScheme: ${path.relative(__dirname, filePath)}`);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    }
}

for (const dir of DIRECTORIES) {
    walk(dir);
}
console.log('Done!');
