const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

const toggleBtnDesktop = `
      <button id="themeToggleDesktop" class="text-secondary hover:text-primary transition-colors flex items-center justify-center p-2 rounded-full hover:bg-surface-variant" aria-label="Toggle Theme">
        <span class="material-symbols-outlined dark:hidden">dark_mode</span>
        <span class="material-symbols-outlined hidden dark:block">light_mode</span>
      </button>`;

const toggleBtnMobile = `
      <button id="themeToggleMobile" class="text-secondary hover:text-primary transition-colors flex items-center justify-start p-2 rounded-lg hover:bg-surface-variant border border-surface-variant" aria-label="Toggle Theme">
        <span class="material-symbols-outlined dark:hidden mr-2">dark_mode</span><span class="dark:hidden font-medium">Dark Mode</span>
        <span class="material-symbols-outlined hidden dark:block mr-2">light_mode</span><span class="hidden dark:block font-medium">Light Mode</span>
      </button>`;

for (const file of htmlFiles) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove floating toggle
  content = content.replace(/<button id="globalThemeToggle"[\s\S]*?<\/button>\n?/g, '');

  // Add into mobile menu
  if (content.includes('id="navLinksMobile"')) {
    if (!content.includes('id="themeToggleMobile"')) {
      content = content.replace(/(<div class="nav-links-mobile[^>]*id="navLinksMobile">)/, `$1\n${toggleBtnMobile}`);
    }
  }

  // Add desktop toggle:
  if (!content.includes('id="themeToggleDesktop"')) {
    // If login link exists:
    if (content.match(/(<div[^>]*>)\s*<a[^>]*href="\/login"/)) {
      content = content.replace(/(<div[^>]*>)\s*(<a[^>]*href="\/login")/, `$1\n${toggleBtnDesktop}\n      $2`);
    } else if (content.match(/(<div[^>]*>)\s*(<span id="navUserName">)/)) {
      content = content.replace(/(<div[^>]*>)\s*(<span id="navUserName">)/, `$1\n${toggleBtnDesktop}\n      $2`);
    } else if (content.match(/<div class="flex gap-3">/)) {
      content = content.replace(/<div class="flex gap-3">/, `<div class="flex items-center gap-3">\n${toggleBtnDesktop}`);
    }
  }

  fs.writeFileSync(filePath, content);
}

const scriptJsPath = path.join(__dirname, 'public/js/script.js');
let scriptContent = fs.readFileSync(scriptJsPath, 'utf8');

scriptContent = scriptContent.replace(
  "const toggleBtn = document.getElementById('globalThemeToggle');",
  "const toggleBtns = [...document.querySelectorAll('#themeToggleDesktop, #themeToggleMobile, #globalThemeToggle')];"
);

scriptContent = scriptContent.replace(
  /if \(toggleBtn\) \{[\s\S]*?\}\n\}/,
  `if (toggleBtns.length > 0) {
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        htmlEl.classList.toggle('dark');
        htmlEl.classList.toggle('light');
        localStorage.setItem('theme', htmlEl.classList.contains('dark') ? 'dark' : 'light');
      });
    });
  }
}`
);

fs.writeFileSync(scriptJsPath, scriptContent);
console.log("Toggle moved!");
