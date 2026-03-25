const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

const lightColors = {
  "on-primary-container":"#828eb1","surface-container-lowest":"#ffffff",
  "primary-container":"#1a2744","on-tertiary-container":"#d07900",
  "primary-fixed-dim":"#b9c6eb","secondary-container":"#d6e3fa",
  "surface-container":"#edeef1","on-surface-variant":"#45464d",
  "error-container":"#ffdad6","background":"#f8f9fc",
  "surface-variant":"#e1e2e5","surface-container-highest":"#e1e2e5",
  "tertiary":"#210e00","on-surface":"#191c1e",
  "on-secondary-container":"#586578","on-error-container":"#93000a",
  "inverse-surface":"#2e3133","inverse-primary":"#b9c6eb",
  "primary-fixed":"#d9e2ff","on-secondary":"#ffffff",
  "on-error":"#ffffff","surface-container-low":"#f2f3f6",
  "secondary-fixed-dim":"#bac7dd","secondary":"#525f72",
  "on-secondary-fixed-variant":"#3b485a",
  "surface":"#f8f9fc","outline-variant":"#c5c6ce",
  "outline":"#75777e","surface-container-high":"#e7e8eb",
  "surface-dim":"#d9dadd","on-primary-fixed":"#0d1b37",
  "on-tertiary-fixed-variant":"#6a3b00","tertiary-fixed":"#ffdcbf",
  "on-tertiary-fixed":"#2d1600","secondary-fixed":"#d6e3fa",
  "surface-bright":"#f8f9fc","on-secondary-fixed":"#0f1c2c",
  "primary":"#04122e","on-primary":"#ffffff",
  "inverse-on-surface":"#f0f1f4","tertiary-container":"#3e2000",
  "error":"#ba1a1a","tertiary-fixed-dim":"#ffb873",
  "surface-tint":"#515e7e","on-primary-fixed-variant":"#3a4665",
  "on-background":"#191c1e","on-tertiary":"#ffffff"
};

const darkColors = {
  "primary": "#b9c6eb",
  "on-primary": "#002a77",
  "primary-container": "#203e85",
  "on-primary-container": "#d9e2ff",
  "secondary": "#bac7dd",
  "on-secondary": "#243140",
  "secondary-container": "#3b485a",
  "on-secondary-container": "#d6e3fa",
  "tertiary": "#ffb873",
  "on-tertiary": "#4a2800",
  "tertiary-container": "#6a3b00",
  "on-tertiary-container": "#ffdcbf",
  "error": "#ffb4ab",
  "on-error": "#690005",
  "error-container": "#93000a",
  "on-error-container": "#ffdad6",
  "background": "#191c1e",
  "on-background": "#e1e2e5",
  "surface": "#191c1e",
  "on-surface": "#e1e2e5",
  "surface-variant": "#45464d",
  "on-surface-variant": "#c5c6ce",
  "outline": "#8f9099",
  "outline-variant": "#45464d",
  "inverse-surface": "#e1e2e5",
  "inverse-on-surface": "#191c1e",
  "inverse-primary": "#04122e",
  "surface-container-lowest": "#0d0f11",
  "surface-container-low": "#111416",
  "surface-container": "#1d2023",
  "surface-container-high": "#282a2d",
  "surface-container-highest": "#333538",
  "primary-fixed": "#d9e2ff",
  "on-primary-fixed": "#0d1b37",
  "primary-fixed-dim": "#b9c6eb",
  "on-primary-fixed-variant": "#3a4665",
  "secondary-fixed": "#d6e3fa",
  "on-secondary-fixed": "#0f1c2c",
  "secondary-fixed-dim": "#bac7dd",
  "on-secondary-fixed-variant": "#3b485a",
  "tertiary-fixed": "#ffdcbf",
  "on-tertiary-fixed": "#2d1600",
  "tertiary-fixed-dim": "#ffb873",
  "on-tertiary-fixed-variant": "#6a3b00",
  "surface-dim": "#111416",
  "surface-bright": "#373a3c",
  "surface-tint": "#b9c6eb"
};

let twConfigColors = {};
for (const key of Object.keys(lightColors)) {
  twConfigColors[key] = `var(--color-${key})`;
}

const twConfigCode = `tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: ${JSON.stringify(twConfigColors, null, 2)},
      fontFamily: {
        "headline":["Instrument Serif","serif"],
        "body":["Geist","sans-serif"],
        "label":["IBM Plex Mono","monospace"]
      },
      borderRadius:{"DEFAULT":"0.25rem","lg":"0.5rem","xl":"0.75rem","full":"9999px"}
    }
  }
};`;
fs.writeFileSync(path.join(__dirname, 'public/js/tailwind-config.js'), twConfigCode);

let lightVars = '';
for (const [key, val] of Object.entries(lightColors)) lightVars += `  --color-${key}: ${val};\n`;
let darkVars = '';
for (const [key, val] of Object.entries(darkColors)) darkVars += `  --color-${key}: ${val};\n`;

const cssCode = `\n/* Theme Variables */\n:root, html.light {\n${lightVars}}\nhtml.dark {\n${darkVars}}\n`;
fs.appendFileSync(path.join(__dirname, 'public/css/theme.css'), cssCode);

const floatingToggle = `\n  <button id="globalThemeToggle" class="fixed bottom-6 left-6 z-[999] w-12 h-12 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform editorial-shadow cursor-pointer" aria-label="Toggle Theme">
    <span class="material-symbols-outlined dark:hidden">dark_mode</span>
    <span class="material-symbols-outlined hidden dark:block">light_mode</span>
  </button>\n</body>`;

for (const file of htmlFiles) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const blockRegex = /<script>\s*tailwind\.config\s*=\s*{[\s\S]*?}<\/script>/g;
  content = content.replace(blockRegex, '<script src="/js/tailwind-config.js"></script>');
  
  if (!content.includes('globalThemeToggle')) {
    content = content.replace('</body>', floatingToggle);
  }
  
  fs.writeFileSync(filePath, content);
}

const scriptJsPath = path.join(__dirname, 'public/js/script.js');
let scriptContent = fs.readFileSync(scriptJsPath, 'utf8');
if (!scriptContent.includes('initTheme()')) {
  const themeLogic = `
function initTheme() {
  const toggleBtn = document.getElementById('globalThemeToggle');
  const htmlEl = document.documentElement;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    htmlEl.classList.remove('light');
    htmlEl.classList.add('dark');
  } else {
    htmlEl.classList.remove('dark');
    htmlEl.classList.add('light');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      htmlEl.classList.toggle('dark');
      htmlEl.classList.toggle('light');
      localStorage.setItem('theme', htmlEl.classList.contains('dark') ? 'dark' : 'light');
    });
  }
}
`;
  scriptContent = scriptContent.replace('initNavbar();', 'initTheme();\\n  initNavbar();');
  scriptContent += '\\n' + themeLogic;
  fs.writeFileSync(scriptJsPath, scriptContent);
}

console.log("Dark mode setup complete!");
