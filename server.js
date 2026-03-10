const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/scrape', async (req, res) => {
  try {
    const { query, location = '', limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const maxLimit = Math.min(parseInt(limit) || 10, 50);
    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const jobs = [];

    $('.job_seen_beacon, .cardOutline').each((index, element) => {
      if (jobs.length >= maxLimit) return false;

      const $element = $(element);
      const title = $element.find('.jobTitle, h2.jobTitle span').text().trim();
      const company = $element.find('.companyName').text().trim();
      const jobLocation = $element.find('.companyLocation').text().trim();
      const salary = $element.find('.salary-snippet, .metadata.salary-snippet-container').text().trim();
      const summary = $element.find('.job-snippet').text().trim();
      const jobKey = $element.find('a.jcs-JobTitle, h2.jobTitle a').attr('data-jk') || '';
      const link = jobKey ? `https://www.indeed.com/viewjob?jk=${jobKey}` : '';

      if (title && company) {
        jobs.push({
          title,
          company,
          location: jobLocation,
          salary: salary || 'Not specified',
          summary: summary || 'No description available',
          link,
          scrapedAt: new Date().toISOString()
        });
      }
    });

    if (jobs.length === 0) {
      return res.status(404).json({ 
        error: 'No jobs found', 
        message: 'Try different search terms or location',
        query,
        location 
      });
    }

    res.status(200).json({
      success: true,
      count: jobs.length,
      query,
      location,
      jobs
    });

  } catch (error) {
    console.error('Scraping error:', error.message);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timeout', message: 'The scraping request took too long' });
    }
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: 'Scraping failed', 
        message: 'Unable to fetch data from Indeed',
        statusCode: error.response.status
      });
    }

    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Indeed Job Scraper API running on port ${PORT}`);
});