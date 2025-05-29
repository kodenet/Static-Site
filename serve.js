const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Serve static files from the dist directory
app.use(express.static('dist'));

// Serve index.html for the root path
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Please run `npm run build` first to generate the site.');
  }
});

// Handle 404s
app.use((req, res) => {
  const notFoundPath = path.join(__dirname, 'dist', '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send('Page not found. Please run `npm run build` first to generate the site.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('If you see a 404 error, please run `npm run build` first.');
}); 