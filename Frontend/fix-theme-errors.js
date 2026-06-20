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

// 1. Auth Screens: These have shadowColor: theme.colors.primary inside the inline style.
// Wait, the error is inside `app/(auth)/signup.tsx(273,46): error TS2304: Cannot find name 'theme'.`
// This happens because `const { colorScheme } = useTheme();` doesn't have `theme` destructured.
// The regex `useThemeRegex` in my script didn't match if there was spaces or newlines differently, or they don't call useTheme() at all.

function ensureThemeDestructured(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let originalContent = content;

    if (!content.includes('const { theme') && !content.includes(', theme } = useTheme()') && !content.includes(',theme} = useTheme()')) {
        content = content.replace(/const\s+\{\s*colorScheme\s*\}\s*=\s*useTheme\(\);/g, 'const { colorScheme, theme } = useTheme();');
        content = content.replace(/const\s+\{\s*colorScheme,\s*isDarkMode\s*\}\s*=\s*useTheme\(\);/g, 'const { colorScheme, isDarkMode, theme } = useTheme();');
    }

    if (content !== originalContent) {
        fs.writeFileSync(filepath, content);
        console.log("Destructured theme in: " + filepath);
    }
}

// Auth files
const authDir = 'f:/Development/Projects/RideSync/Frontend/app/(auth)';
['forgot-password.tsx', 'reset-password/[token].tsx', 'signin.tsx', 'signup.tsx'].forEach(f => {
    ensureThemeDestructured(path.join(authDir, f));
});

// Driver files
const driverDir = 'f:/Development/Projects/RideSync/Frontend/app/(driver)';
['active-ride.tsx', 'rides.tsx'].forEach(f => {
    ensureThemeDestructured(path.join(driverDir, f));
});

// Rider files
const riderDir = 'f:/Development/Projects/RideSync/Frontend/app/(rider)';
['create-ride.tsx', 'home.tsx', 'live-tracking.tsx', 'rides.tsx'].forEach(f => {
    ensureThemeDestructured(path.join(riderDir, f));
});

// Map styles outside of components (active-ride, create-ride, home, live-tracking)
function fixMapStyles(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(/color:\s*theme\.colors\.textMuted/g, 'color: "#748096"'); // revert inside DARK_MAP_STYLE
    fs.writeFileSync(filepath, content);
}

fixMapStyles(path.join(driverDir, 'active-ride.tsx'));
fixMapStyles(path.join(riderDir, 'create-ride.tsx'));
fixMapStyles(path.join(riderDir, 'home.tsx'));
fixMapStyles(path.join(riderDir, 'live-tracking.tsx'));


// components
const componentsDir = 'f:/Development/Projects/RideSync/Frontend/components/ride';
ensureThemeDestructured(path.join(componentsDir, 'OTPInput.tsx'));

// LocationSearchInput.tsx: line 39: dotColor = theme.colors.primary in interface/default props
processFile(path.join(componentsDir, 'LocationSearchInput.tsx'), [
    { from: /dotColor = theme\.colors\.primary/g, to: 'dotColor = "#11E0C5"' }
]);

// RideStatusCard.tsx: line 33: color: theme.colors.primary in fallback
processFile(path.join(componentsDir, 'RideStatusCard.tsx'), [
    { from: /color: theme\.colors\.primary, \/\/ fallback/g, to: 'color: "#11E0C5", // fallback' }
]);
