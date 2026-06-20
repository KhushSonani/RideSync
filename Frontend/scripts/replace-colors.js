const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
    path.join(__dirname, '../app'),
    path.join(__dirname, '../components'),
    path.join(__dirname, '../constants')
];

const REPLACEMENTS = [
    // Backgrounds
    { regex: /bg-\[\#070B12\](\/\d+)?/g, replace: 'bg-background$1' },
    { regex: /bg-\[\#0D1420\](\/\d+)?/g, replace: 'bg-card$1' },
    { regex: /bg-\[\#131D2B\](\/\d+)?/g, replace: 'bg-input$1' },
    { regex: /bg-\[\#11E0C5\](\/\d+)?/g, replace: 'bg-primary$1' },
    
    // Texts
    { regex: /text-\[\#748096\]/g, replace: 'text-muted' },
    { regex: /text-white/g, replace: 'text-foreground' },
    { regex: /text-\[\#11E0C5\]/g, replace: 'text-primary' },

    // Borders
    { regex: /border-\[\#11E0C5\]/g, replace: 'border-primary' },
    { regex: /border-white\/10/g, replace: 'border-border' },
    { regex: /border-white\/\[0\.05\]/g, replace: 'border-border' },
    { regex: /border-white\/\[0\.06\]/g, replace: 'border-border' },
    { regex: /border-white\/\[0\.08\]/g, replace: 'border-border' },
    { regex: /border-white\/\[0\.1\]/g, replace: 'border-border' },
    { regex: /border-white\/\[0\.15\]/g, replace: 'border-border' },
    { regex: /border-white\/20/g, replace: 'border-border' },

    // Component props
    { regex: /color="\#070B12"/g, replace: 'color="var(--color-background)"' },
    { regex: /color="\#0D1420"/g, replace: 'color="var(--color-card)"' },
    { regex: /color="\#FFFFFF"/g, replace: 'color="var(--color-foreground)"' },
    { regex: /color="\#748096"/g, replace: 'color="var(--color-muted)"' },
    { regex: /color="\#11E0C5"/g, replace: 'color="var(--color-primary)"' },
    
    // Inline style colors
    { regex: /backgroundColor:\s*['"]#070B12['"]/g, replace: 'backgroundColor: "var(--color-background)"' },
    { regex: /backgroundColor:\s*['"]#0D1420['"]/g, replace: 'backgroundColor: "var(--color-card)"' },
    { regex: /color:\s*['"]#FFFFFF['"]/g, replace: 'color: "var(--color-foreground)"' },
    { regex: /color:\s*['"]#748096['"]/g, replace: 'color: "var(--color-muted)"' },
    { regex: /color:\s*['"]#11E0C5['"]/g, replace: 'color: "var(--color-primary)"' },
    { regex: /style=\{\{\s*backgroundColor:\s*COLORS\.background\s*\}\}/g, replace: 'className="bg-background"' },
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
console.log('Done!');
