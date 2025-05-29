const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

console.log('Starting build process...');

// Configure marked for security
marked.setOptions({
  headerIds: false,
  mangle: false
});

// Ensure build directory exists
console.log('Creating dist directory...');
fs.ensureDirSync('dist');

// Copy static assets
console.log('Copying static assets...');
if (fs.existsSync('src/static')) {
  fs.copySync('src/static', 'dist', { overwrite: true });
  console.log('Static assets copied successfully.');
} else {
  console.log('No static assets found.');
}

// Process content directories
const contentDirs = ['pages', 'blog'];
contentDirs.forEach(dir => {
  console.log(`Processing ${dir} directory...`);
  const srcDir = path.join('src/content', dir);
  if (fs.existsSync(srcDir)) {
    processDirectory(srcDir, dir);
  } else {
    console.log(`${srcDir} does not exist.`);
  }
});

function processDirectory(srcDir, type) {
  const files = fs.readdirSync(srcDir);
  console.log(`Found ${files.length} files in ${srcDir}`);
  
  files.forEach(file => {
    if (path.extname(file) === '.md') {
      try {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
        const { attributes, body } = frontMatter(content);
        const html = marked(body);
        
        // Use the appropriate template
        const templatePath = path.join('src/templates', `${type}.html`);
        console.log(`Using template: ${templatePath}`);
        
        if (!fs.existsSync(templatePath)) {
          console.error(`Template ${templatePath} not found!`);
          return;
        }
        
        const template = fs.readFileSync(templatePath, 'utf8');
        let finalHtml = template
          .replace(/\{\{title\}\}/g, attributes.title || 'Untitled')
          .replace('{{content}}', html)
          .replace(/\{\{date\}\}/g, attributes.date || '');
        
        // Special handling for home page
        const outFile = file === 'home.md' 
          ? path.join('dist', 'index.html')
          : path.join('dist', type, file.replace('.md', '.html'));
        
        console.log(`Writing to: ${outFile}`);
        fs.ensureDirSync(path.dirname(outFile));
        fs.writeFileSync(outFile, finalHtml);
        console.log(`Successfully generated: ${outFile}`);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  });
}

console.log('Build process complete.'); 