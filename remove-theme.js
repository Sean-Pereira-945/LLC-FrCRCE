const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/<button id="themeToggleDesktop"[\s\S]*?<\/button>\s*/g, '');
  content = content.replace(/<button id="themeToggleMobile"[\s\S]*?<\/button>\s*/g, '');
  content = content.replace(/<button id="globalThemeToggle"[\s\S]*?<\/button>\s*/g, '');

  fs.writeFileSync(filePath, content);
}

const scriptJsPath = path.join(__dirname, 'public/js/script.js');
let scriptContent = fs.readFileSync(scriptJsPath, 'utf8');

scriptContent = scriptContent.replace(/initTheme\(\);\s*/g, '');
scriptContent = scriptContent.replace(/function initTheme\(\) \{[\s\S]*?\}\s*$/, '');

fs.writeFileSync(scriptJsPath, scriptContent);
console.log("Theme toggles removed!");
