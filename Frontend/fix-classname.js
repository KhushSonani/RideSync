const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('f:/Development/Projects/RideSync/Frontend/app', (filepath) => {
    if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
        let content = fs.readFileSync(filepath, 'utf8');
        if (content.includes('className="flex-1" className=')) {
            content = content.replace(/className=\"flex-1\" className=\"([^\"]+)\"/g, 'className=\"flex-1 $1\"');
            fs.writeFileSync(filepath, content);
            console.log('Fixed double className in ' + filepath);
        }
    }
});
