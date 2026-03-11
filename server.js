const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

const RAPIDAPI_PROXY_SECRET = process.env.RAPIDAPI_PROXY_SECRET;

// Proxy auth middleware
function verifyProxy(req, res, next) {
  if (RAPIDAPI_PROXY_SECRET && req.headers['x-rapidapi-proxy-secret'] !== RAPIDAPI_PROXY_SECRET) {
    if (req.path === '/api/health') return next();
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
app.use(verifyProxy);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/search', async (req, res) => {
  try {
    const { query, location, page = 1 } = req.query;
    if (!query) return res.status(400).json({ error: 'query parameter is required' });

    const start = (parseInt(page) - 1) * 10;
    const params = new URLSearchParams({
      q: query,
      start: String(start),
    });
    if (location) params.set('l', location);

    const url = `https://www.indeed.com/jobs?${params.toString()}`;
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const jobs = [];

    $('div.job_seen_beacon, div.jobsearch-ResultsList > div, .result, .tapItem').each((i, el) => {
      const titleEl = $(el).find('h2 a, .jobTitle a, a.jcs-JobTitle');
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const company = $(el).find('[data-testid="company-name"], .companyName, .company').first().text().trim();
      const loc = $(el).find('[data-testid="text-location"], .companyLocation, .location').first().text().trim();
      const salary = $(el).find('.salary-snippet-container, .estimated-salary, [data-testid="attribute_snippet_testid"]').first().text().trim();
      const snippet = $(el).find('.job-snippet, .heading6, td.snip').first().text().trim();
      const posted = $(el).find('.date, .new, span[data-testid="myJobsStateDate"]').first().text().trim();

      if (title) {
        jobs.push({
          title,
          company: company || null,
          location: loc || null,
          salary: salary || null,
          snippet: snippet || null,
          posted: posted || null,
          url: link ? (link.startsWith('http') ? link : `https://www.indeed.com${link}`) : null,
        });
      }
    });

    res.json({
      status: 'ok',
      query,
      location: location || null,
      page: parseInt(page),
      results: jobs.length,
      jobs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scrape Indeed', message: err.message });
  }
});

// Keep /api/jobs for backwards compat
app.get('/api/jobs', (req, res) => {
  res.redirect(307, `/api/search?${new URLSearchParams(req.query).toString()}`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});