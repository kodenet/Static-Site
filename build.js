const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');
const Handlebars = require('handlebars');

console.log('Starting build process...');

// Configure marked for security
marked.setOptions({
  headerIds: false,
  mangle: false
});

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date; // Return original if invalid
  
  // Format the date in a consistent way
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'  // Use UTC to avoid timezone issues
  };
  return d.toLocaleDateString('en-US', options);
});

// Helper to check if a post has been modified after its creation
Handlebars.registerHelper('isModified', function(createDate, updateDate) {
  if (!createDate || !updateDate) return false;
  const created = new Date(createDate);
  const updated = new Date(updateDate);
  // Consider it modified only if the difference is more than 1 second
  return Math.abs(updated - created) > 1000;
});

Handlebars.registerHelper('slugify', function(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
});

Handlebars.registerHelper('encodeUrl', function(text) {
  return encodeURIComponent(text);
});

// Helper to get recommended posts
Handlebars.registerHelper('getRecommendedPosts', function(currentSlug, limit = 3) {
  // Filter out the current post
  const otherPosts = blogPosts.filter(post => !post.url.endsWith(`/${currentSlug}`));
  
  // Get category of current post if available
  const currentPost = blogPosts.find(post => post.url.endsWith(`/${currentSlug}`));
  const currentCategory = currentPost?.category;

  // Sort posts: prioritize same category, then by date
  const sortedPosts = otherPosts.sort((a, b) => {
    // First prioritize posts from the same category
    if (currentCategory) {
      if (a.category === currentCategory && b.category !== currentCategory) return -1;
      if (b.category === currentCategory && a.category !== currentCategory) return 1;
    }
    
    // Then sort by date (newest first)
    const dateA = new Date(a.updatedDate || a.date);
    const dateB = new Date(b.updatedDate || b.date);
    return dateB - dateA;
  });

  // Always return exactly 3 posts or all available if less than 3
  const maxPosts = Math.min(3, sortedPosts.length);
  return sortedPosts.slice(0, maxPosts);
});

// Store blog posts for index generation
let blogPosts = [];

// Load authors data
const authors = {};
const authorsDir = path.join('src', 'data', 'authors');
if (fs.existsSync(authorsDir)) {
  fs.readdirSync(authorsDir).forEach(file => {
    if (path.extname(file) === '.json') {
      const authorData = JSON.parse(fs.readFileSync(path.join(authorsDir, file), 'utf8'));
      authors[authorData.id] = authorData;
    }
  });
}

// Register Handlebars helper for author data
Handlebars.registerHelper('getAuthor', function(authorId) {
  return authors[authorId] || null;
});

// Function to calculate reading time
function calculateReadingTime(content) {
  // Remove HTML tags and markdown syntax
  const cleanText = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace markdown links with just the text
    .replace(/[#*`_~]/g, '') // Remove markdown syntax characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Count words (split by whitespace)
  const words = cleanText.split(/\s+/).length;
  
  // Calculate reading time (assuming 200 words per minute)
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return `${minutes} min read`;
}

// Function to process a markdown file and get its metadata
function processMarkdownFile(filePath, content) {
  const { attributes, body } = frontMatter(content);
  
  // Get the timestamps from .timestamps.json
  const timestampsPath = path.join('src', 'content', 'blog', '.timestamps.json');
  const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));
  const filename = path.basename(filePath);
  
  if (timestamps[filename]) {
    // Use the creation date as the publish date
    attributes.date = new Date(timestamps[filename].created);
    
    // Only set updatedDate if the file was modified after creation
    const modifiedDate = new Date(timestamps[filename].modified);
    const createdDate = new Date(timestamps[filename].created);
    
    if (modifiedDate > createdDate) {
      attributes.updatedDate = modifiedDate;
    }
  } else {
    // Fallback to current date if no timestamps found
    const now = new Date();
    attributes.date = now;
    // Don't set updatedDate for new files
  }

  // Convert markdown to HTML
  const htmlContent = marked(body);
  
  // Calculate reading time based on both markdown content and resulting HTML
  attributes.readingTime = calculateReadingTime(body + htmlContent);
  
  return {
    attributes,
    body: htmlContent
  };
}

// Function to update timestamps for blog posts
function updateTimestamps(filePath) {
  const timestampsPath = path.join('src', 'content', 'blog', '.timestamps.json');
  const filename = path.basename(filePath);
  
  // Read existing timestamps or create new object
  let timestamps = {};
  if (fs.existsSync(timestampsPath)) {
    timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));
  }
  
  // Get file stats
  const stats = fs.statSync(filePath);
  
  if (!timestamps[filename]) {
    // New file - set both created and modified to the same time
    timestamps[filename] = {
      created: stats.birthtime.toISOString(),
      modified: stats.birthtime.toISOString()
    };
  } else {
    // Existing file - only update modified time if it's actually changed
    const currentModified = new Date(timestamps[filename].modified);
    const newModified = new Date(stats.mtime);
    
    if (Math.abs(newModified - currentModified) > 1000) {
      timestamps[filename].modified = stats.mtime.toISOString();
    }
  }
  
  // Write updated timestamps back to file
  fs.writeFileSync(timestampsPath, JSON.stringify(timestamps, null, 2));
}

// Process content directories
function processDirectory(srcDir, type) {
  const files = fs.readdirSync(srcDir);
  console.log(`Found ${files.length} files in ${srcDir}`);
  
  files.forEach(file => {
    if (path.extname(file) === '.md') {
      try {
        console.log(`Processing ${file}...`);
        const filePath = path.join(srcDir, file);
        
        // Update timestamps before processing the file
        if (type === 'blog') {
          updateTimestamps(filePath);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const { attributes, body } = processMarkdownFile(filePath, content);
        
        // Store blog post info for index generation
        if (type === 'blog') {
          const paragraphs = content.split('\n\n');
          let excerpt = '';
          for (let i = 0; i < paragraphs.length; i++) {
            if (!paragraphs[i].startsWith('#') && !paragraphs[i].includes('|')) {
              excerpt = paragraphs[i];
              break;
            }
          }
          
          blogPosts.push({
            title: attributes.title,
            date: attributes.date,
            updatedDate: attributes.updatedDate,
            excerpt: marked(excerpt),
            url: `/blog/${file.replace('.md', '.html')}`,
            author: authors[attributes.authorId]?.name,
            authorId: attributes.authorId,
            featuredImage: attributes.featuredImage,
            featuredImageAlt: attributes.featuredImageAlt,
            category: attributes.category || 'BLOG'
          });
        }
        
        // Use the appropriate template
        const templatePath = path.join('src/templates', `${type}.html`);
        console.log(`Using template: ${templatePath}`);
        
        if (!fs.existsSync(templatePath)) {
          console.error(`Template ${templatePath} not found!`);
          return;
        }
        
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const template = Handlebars.compile(templateContent);
        
        // Prepare template data
        const templateData = {
          ...attributes,
          content: body,
          author: authors[attributes.authorId]
        };
        
        // Generate final HTML using Handlebars
        const finalHtml = template(templateData);
        
        // Determine output path
        let outFile;
        if (file === 'home.md') {
          outFile = path.join('dist', 'index.html');
        } else if (file === '404.md') {
          outFile = path.join('dist', '404.html');
        } else {
          outFile = path.join('dist', type, file.replace('.md', '.html'));
        }
        
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

// Ensure build directory exists
console.log('Creating dist directory...');
fs.ensureDirSync('dist');

// Copy public directory if it exists
console.log('Copying public directory...');
if (fs.existsSync('public')) {
  fs.copySync('public', 'dist');
  console.log('Public directory copied successfully.');
}

// Copy static assets
console.log('Copying static assets...');
if (fs.existsSync('src/static')) {
  fs.copySync('src/static', 'dist');
  console.log('Static assets copied successfully.');
}

// Process content directories
const contentDirs = ['pages', 'blog'];
contentDirs.forEach(dir => {
  console.log(`Processing ${dir} directory...`);
  const srcDir = path.join('src/content', dir);
  if (fs.existsSync(srcDir)) {
    processDirectory(srcDir, dir);
  }
});

// Generate blog index page
console.log('Generating blog index page...');
generateBlogIndex();

function generateBlogIndex() {
  try {
    blogPosts.sort((a, b) => {
      // Sort by updated date if available, otherwise use original date
      const dateA = a.updatedDate || a.date;
      const dateB = b.updatedDate || b.date;
      return new Date(dateB) - new Date(dateA);
    });
    
    const templatePath = path.join('src/templates', 'blog-index.html');
    if (!fs.existsSync(templatePath)) {
      console.error('Blog index template not found!');
      return;
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    
    const finalHtml = template({
      blog_posts: blogPosts.map(post => {
        // Format the date based on whether it's a new post or an updated one
        const createdDate = new Date(post.date);
        const modifiedDate = post.updatedDate ? new Date(post.updatedDate) : null;
        
        // Format the date string
        let dateString = createdDate.toLocaleDateString('en-US', { 
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        });

        // Only show "Updated:" if the post was modified at a significantly different time
        if (modifiedDate && Math.abs(modifiedDate - createdDate) > 1000) {
          dateString = `<span class="updated">Updated: ${modifiedDate.toLocaleDateString('en-US', { 
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
          })}</span>`;
        }

        return `
        <article class="blog-post-preview">
          <h2><a href="${post.url}">${post.title}</a></h2>
          <div class="post-meta">
            ${dateString}
            ${post.author ? ` | By ${post.author}` : ''}
          </div>
        </article>
      `}).join('')
    });
    
    const outFile = path.join('dist', 'blog', 'index.html');
    fs.ensureDirSync(path.dirname(outFile));
    fs.writeFileSync(outFile, finalHtml);
    console.log('Blog index page generated successfully.');
  } catch (error) {
    console.error('Error generating blog index:', error);
  }
}

console.log('Build process complete.'); 