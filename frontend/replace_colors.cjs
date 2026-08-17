const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const colorMap = {
    '#3A3F8F': '#097969',
    '#3a3f8f': '#097969',
    '#222777': '#075e51',
    '#1E2255': '#064D43',
    '#1e2255': '#064D43',
    '#C5CAE9': '#A3E4D7',
    '#c5cae9': '#A3E4D7',
    '#E2E6F4': '#E0EFEA',
    '#e2e6f4': '#E0EFEA',
    '#f9f9ff': '#F4F9F8'
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
                console.log(`Updated colors in: ${fullPath.replace(__dirname, '')}`);
            }
        }
    }
}

console.log("Starting global color replacement...");
processDirectory(srcDir);
console.log("Done.");
