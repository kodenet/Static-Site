# Static Site with HTML, CSS, Javascript, and simple Node libraries

A simple static site generator that converts Markdown content into HTML pages. Perfect for personal websites and blogs.

## Features

- Markdown support for content
- Blog functionality
- Responsive design
- No complex frameworks
- Fast build process

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the site:
   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm run serve
   ```

## Project Structure

- `src/content/pages/` - Markdown files for static pages
- `src/content/blog/` - Markdown files for blog posts
- `src/templates/` - HTML templates
- `src/static/` - Static assets (CSS, images, etc.)
- `dist/` - Generated site (created after build)

## Adding Content

### Pages

1. Create a new `.md` file in `src/content/pages/`
2. Add front matter with title:
   ```md
   ---
   title: Your Page Title
   ---
   ```
3. Write your content in Markdown

### Blog Posts

1. Create a new `.md` file in `src/content/blog/`
2. Add front matter with title and date:
   ```md
   ---
   title: Your Post Title
   date: YYYY-MM-DD
   ---
   ```
3. Write your post content in Markdown

## Building for Production

1. Run `npm run build`
2. Deploy the contents of the `dist/` directory to your web server
