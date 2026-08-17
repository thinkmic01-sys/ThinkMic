const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const colorMap = {
    '#00C2CB': '#EAB308',
    '#00c2cb': '#EAB308',
    '#E6FBFC': '#FEF9C3',
    '#e6fbfc': '#FEF9C3',
};

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            for (const [oldColor, newColor] of Object.entries(colorMap)) {
                if (content.includes(oldColor)) {
                    // Global replace
                    content = content.split(oldColor).join(newColor);
                    modified = true;
                }
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated accent colors in: ${fullPath.replace(__dirname, '')}`);
            }
        }
    }
}

console.log("Starting global accent replacement...");
processDirectory(srcDir);
console.log("Done.");
