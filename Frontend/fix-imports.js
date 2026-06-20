const fs = require('fs');

let file = 'f:/Development/Projects/RideSync/Frontend/components/common/RideHistoryCard.tsx';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('import { useTheme }')) {
    content = 'import { useTheme } from "@/store/ThemeContext";\n' + content;
    fs.writeFileSync(file, content);
}

file = 'f:/Development/Projects/RideSync/Frontend/components/ride/LocationSearchInput.tsx';
content = fs.readFileSync(file, 'utf8');
if (!content.includes('import { useTheme }')) {
    content = content.replace(/const colorScheme = useColorScheme\(\);/g, 'const { colorScheme } = useTheme();');
    content = 'import { useTheme } from "@/store/ThemeContext";\n' + content;
    fs.writeFileSync(file, content);
}
