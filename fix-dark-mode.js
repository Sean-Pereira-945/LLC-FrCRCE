const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'public/css/theme.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the html.dark block in theme.css with a curated set of dark variables
const newDarkVars = `html.dark {
  --color-primary: #1e293b; 
  --color-on-primary: #ffffff;
  --color-primary-container: #0f172a;
  --color-on-primary-container: #cbd5e1;
  --color-secondary: #475569;
  --color-on-secondary: #ffffff;
  --color-secondary-container: #1e293b;
  --color-on-secondary-container: #f1f5f9;
  --color-tertiary: #b45309; 
  --color-on-tertiary: #ffffff;
  --color-tertiary-container: #78350f;
  --color-on-tertiary-container: #fde68a;
  --color-error: #991b1b;
  --color-on-error: #ffffff;
  --color-error-container: #7f1d1d;
  --color-on-error-container: #fca5a5;
  --color-background: #020617;
  --color-on-background: #f8fafc;
  --color-surface: #0f172a;
  --color-on-surface: #f1f5f9;
  --color-surface-variant: #1e293b;
  --color-on-surface-variant: #cbd5e1;
  --color-outline: #475569;
  --color-outline-variant: #334155;
  --color-inverse-surface: #f8fafc;
  --color-inverse-on-surface: #0f172a;
  --color-inverse-primary: #3b82f6;
  --color-surface-container-lowest: #020617;
  --color-surface-container-low: #0f172a;
  --color-surface-container: #1e293b;
  --color-surface-container-high: #334155;
  --color-surface-container-highest: #475569;
  --color-primary-fixed: #1e40af;
  --color-on-primary-fixed: #eff6ff;
  --color-primary-fixed-dim: #2563eb;
  --color-on-primary-fixed-variant: #dbeafe;
  --color-secondary-fixed: #475569;
  --color-on-secondary-fixed: #f8fafc;
  --color-secondary-fixed-dim: #64748b;
  --color-on-secondary-fixed-variant: #f1f5f9;
  --color-tertiary-fixed: #d97706;
  --color-on-tertiary-fixed: #fffbeb;
  --color-tertiary-fixed-dim: #f59e0b;
  --color-on-tertiary-fixed-variant: #fef3c7;
  --color-surface-dim: #020617;
  --color-surface-bright: #334155;
  --color-surface-tint: #3b82f6;
}`;

css = css.replace(/html\.dark\s*\{[^}]*\}/, newDarkVars);

fs.writeFileSync(cssPath, css);


const viewsDir = path.join(__dirname, 'views');
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

for (const file of htmlFiles) {
  const filePath = path.join(viewsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Swap out blinding white backgrounds for responsive semantic containers
  content = content.replace(/\bbg-white(?![\/\w])/g, 'bg-surface-container-lowest');
  content = content.replace(/\bbg-white\/80\b/g, 'bg-surface-container-lowest/80');
  content = content.replace(/\bbg-white\/90\b/g, 'bg-surface-container-lowest/90');

  // For text strings
  content = content.replace(/\btext-slate-300\b/g, 'text-inverse-surface');
  content = content.replace(/\btext-slate-400\b/g, 'text-on-surface-variant');
  content = content.replace(/\btext-slate-500\b/g, 'text-outline');

  // Input background overrides (they used bg-white)
  content = content.replace(/bg-white(?=.*form-input-themed)/g, 'bg-surface-container'); 
  // It's safer to just let the main bg-white replacement handle it, but wait: JS regexes evaluate left-to-right. 
  // We already replaced bg-white. Let's fix inputs manually by adding custom CSS instead.

  fs.writeFileSync(filePath, content);
}

// Add CSS to handle the forms inputs in dark mode
let additionalCss = `\n/* Dark mode Form fixes */\nhtml.dark .form-input-themed {\n  background-color: var(--color-surface-container-highest) !important;\n  color: var(--color-on-surface) !important;\n  border-color: var(--color-outline-variant) !important;\n}\n`;
if (!css.includes('Dark mode Form fixes')) {
  fs.appendFileSync(cssPath, additionalCss);
}

console.log("Refined definitions applied!");
