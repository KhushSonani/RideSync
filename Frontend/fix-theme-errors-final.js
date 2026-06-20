const fs = require('fs');
const path = require('path');

function processFile(filepath, replaces) {
    let content = fs.readFileSync(filepath, 'utf8');
    let originalContent = content;

    for (let r of replaces) {
        content = content.replace(r.from, r.to);
    }

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content);
        console.log("Fixed: " + filepath);
    }
}

// 1. Auth Screens
const authDir = 'f:/Development/Projects/RideSync/Frontend/app/(auth)';
['forgot-password.tsx', 'reset-password/[token].tsx', 'signin.tsx', 'signup.tsx'].forEach(f => {
    let p = path.join(authDir, f);
    let content = fs.readFileSync(p, 'utf8');
    
    // add import if missing
    if (!content.includes('import { useTheme }')) {
        content = 'import { useTheme } from "@/store/ThemeContext";\n' + content;
    }
    
    // add destructuring
    if (!content.includes('const { theme } = useTheme()') && !content.includes(', theme } = useTheme()')) {
        // Find main component export
        content = content.replace(/export default function \w+\(\) \{/g, match => match + '\n    const { theme } = useTheme();');
    }
    
    fs.writeFileSync(p, content);
    console.log("Fixed auth: " + f);
});

// 2. Rider / Driver Rides.tsx 
// app/(driver)/rides.tsx and app/(rider)/rides.tsx
['f:/Development/Projects/RideSync/Frontend/app/(driver)/rides.tsx', 'f:/Development/Projects/RideSync/Frontend/app/(rider)/rides.tsx'].forEach(p => {
    let content = fs.readFileSync(p, 'utf8');
    
    // add destructuring
    if (!content.includes('const { theme } = useTheme()') && !content.includes(', theme } = useTheme()')) {
        content = content.replace(/export default function \w+\(\) \{/g, match => match + '\n    const { theme } = useTheme();');
    }
    
    fs.writeFileSync(p, content);
    console.log("Fixed rides: " + p);
});

// 3. DARK_MAP_STYLE revert
['active-ride.tsx', 'create-ride.tsx', 'home.tsx', 'live-tracking.tsx'].forEach(f => {
    const isDriver = f === 'active-ride.tsx';
    let p = path.join('f:/Development/Projects/RideSync/Frontend/app', isDriver ? '(driver)' : '(rider)', f);
    
    let content = fs.readFileSync(p, 'utf8');
    // Replace theme.colors.textMuted in DARK_MAP_STYLE block
    content = content.replace(/color:\s*theme\.colors\.textMuted/g, 'color: "#748096"');
    
    fs.writeFileSync(p, content);
    console.log("Fixed map style: " + f);
});
