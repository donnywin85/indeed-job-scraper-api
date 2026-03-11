const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Indeed Job Scraper API' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ healthy: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});