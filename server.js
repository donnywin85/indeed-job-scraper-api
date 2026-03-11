const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/jobs', (req, res) => {
  res.json({ status: 'ok', message: 'Jobs endpoint' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});