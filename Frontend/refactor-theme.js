const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let count = 0;

function processFile(filepath) {
    if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
        let content = fs.readFileSync(filepath, 'utf8');
        let modified = false;

        if (content.includes("const colorScheme = require('react-native').useColorScheme();")) {
            content = content.replace(/const colorScheme = require\('react-native'\)\.useColorScheme\(\);/g, 'const { colorScheme } = useTheme();');
            modified = true;
        }
        
        if (content.includes("const colorScheme = Platform.OS === 'web' ? 'dark' : require('react-native').useColorScheme();")) {
            content = content.replace(/const colorScheme = Platform\.OS === 'web' \? 'dark' : require\('react-native'\)\.useColorScheme\(\);/g, 'const { colorScheme } = useTheme();');
            modified = true;
        }

        if (modified) {
            if (!content.includes('import { useTheme } from "@/store/ThemeContext";')) {
                const importMatch = content.match(/import .* from .*;/g);
                if (importMatch && importMatch.length > 0) {
                    const lastImport = importMatch[importMatch.length - 1];
                    content = content.replace(lastImport, lastImport + '\nimport { useTheme } from "@/store/ThemeContext";');
                } else {
                    content = 'import { useTheme } from "@/store/ThemeContext";\n' + content;
                }
            }
            fs.writeFileSync(filepath, content);
            count++;
            console.log("Updated: " + filepath);
        }
    }
}

walkDir('f:/Development/Projects/RideSync/Frontend/app', processFile);
walkDir('f:/Development/Projects/RideSync/Frontend/components', processFile);

console.log('Modified files count: ' + count);
