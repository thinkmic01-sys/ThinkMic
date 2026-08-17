// Follow-up to replace_colors.cjs / replace_accents.cjs - those two scripts only matched
// the exact hex codes in their colorMap, so a handful of closely-related shades from the old
// navy+cyan palette were left behind: a second bright-cyan variant (#6bf6ff, used for icons/
// text/borders alongside the primary #00C2CB->now #EAB308 accent), its hover-darken partner
// (#61f4fd), and the "text-on-badge" teal shades (#006e73/#00a8b0) that were designed to sit
// on the old pale-cyan badge background (#E6FBFC->now #FEF9C3, already swept) - left as teal
// they now clash with a pale-yellow badge instead of reading as one cohesive accent family.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const colorMap = {
    '#6bf6ff': '#EAB308',
    '#6BF6FF': '#EAB308',
    '#61f4fd': '#CA8A04',
    '#61F4FD': '#CA8A04',
    '#006e73': '#854d0e',
    '#00a8b0': '#B45309'
};

// rgba() glow/shadow effects using the old cyan RGB triplets - not caught by the hex-only maps above
const rgbaMap = [
    [/rgba\(\s*0,\s*194,\s*203,/g, 'rgba(234, 179, 8,'],
    [/rgba\(\s*107,\s*246,\s*255,/g, 'rgba(234, 179, 8,']
];

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
                    content = content.split(oldColor).join(newColor);
                    modified = true;
                }
            }

            for (const [pattern, replacement] of rgbaMap) {
                if (pattern.test(content)) {
                    content = content.replace(pattern, replacement);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated leftover accents in: ${fullPath.replace(__dirname, '')}`);
            }
        }
    }
}

console.log('Starting leftover accent replacement...');
processDirectory(srcDir);
console.log('Done.');
