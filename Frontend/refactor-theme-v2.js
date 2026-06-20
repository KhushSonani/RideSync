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
    if (filepath.endsWith('.tsx') || filepath.endsWith('.ts') || filepath.endsWith('.js')) {
        let content = fs.readFileSync(filepath, 'utf8');
        let originalContent = content;

        // Custom edge cases
        content = content.replace(/countdown <= 10 \? "#EF4444" : "#11E0C5"/g, 'countdown <= 10 ? theme.colors.danger : theme.colors.primary');
        content = content.replace(/isPickup \? "#11E0C5" : "#EF4444"/g, 'isPickup ? theme.colors.primary : theme.colors.danger');
        content = content.replace(/status === "verified" \? "#10B981" : status === "rejected" \? "#EF4444" : status === "under_review" \? "#3B82F6" : status === "pending" \? "#F59E0B" : "#11E0C5"/g, 'status === "verified" ? theme.colors.success : status === "rejected" ? theme.colors.danger : status === "under_review" ? "#3B82F6" : status === "pending" ? "#F59E0B" : theme.colors.primary');
        
        content = content.replace(/trackColor=\{\{ false: "#1A2536", true: "#11E0C550" \}\}/g, 'trackColor={{ false: theme.colors.border, true: theme.colors.primary + "50" }}');
        content = content.replace(/thumbColor=\{isOnline \? "#11E0C5" : "#748096"\}/g, 'thumbColor={isOnline ? theme.colors.primary : theme.colors.textMuted}');
        content = content.replace(/color: "#11E0C5"/g, 'color: theme.colors.primary');
        content = content.replace(/dotColor = "#11E0C5"/g, 'dotColor = theme.colors.primary');
        content = content.replace(/from-\[#11E0C5\]/g, 'from-primary');
        content = content.replace(/shadow-\[#11E0C5\]\/10/g, 'shadow-primary/10');
        content = content.replace(/shadow-\[#11E0C5\]\/20/g, 'shadow-primary/20');
        content = content.replace(/shadow-\[#11E0C5\]/g, 'shadow-primary');

        if (content !== originalContent) {
            fs.writeFileSync(filepath, content);
            count++;
            console.log("Updated: " + filepath);
        }
    }
}

walkDir('f:/Development/Projects/RideSync/Frontend/app', processFile);
walkDir('f:/Development/Projects/RideSync/Frontend/components', processFile);

console.log('Modified files count: ' + count);
