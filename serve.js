const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const HOST = 'localhost';

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

// More explicit server startup
const server = app.listen(PORT, HOST, (error) => {
  if (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('If you see a 404 error, please run `npm run build` first.');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
}); 