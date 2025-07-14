const express = require('express');
const path = require('path');
const logger = require('../logging-middleware/logger');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(logger);

const urlDatabase = {};
const clickStats = {};

function generateShortcode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidShortcode(code) {
  return /^[a-zA-Z0-9]{3,16}$/.test(code);
}

app.post('/shorturls', (req, res) => {
  const { url, validity, shortcode } = req.body;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL.' });
  }
  let code = shortcode;
  if (code) {
    if (!isValidShortcode(code)) {
      return res.status(400).json({ error: 'Shortcode must be alphanumeric and 3-16 chars.' });
    }
    if (urlDatabase[code]) {
      return res.status(409).json({ error: 'Shortcode already in use.' });
    }
  } else {
    do {
      code = generateShortcode(6);
    } while (urlDatabase[code]);
  }
  const now = new Date();
  const validMinutes = Number.isInteger(validity) && validity > 0 ? validity : 30;
  const expiry = new Date(now.getTime() + validMinutes * 60000);
  urlDatabase[code] = {
    originalUrl: url,
    createdAt: now.toISOString(),
    expiry: expiry.toISOString(),
    shortcode: code
  };
  clickStats[code] = clickStats[code] || [];
  const host = req.protocol + '://' + req.get('host');
  res.status(201).json({
    shortLink: `${host}/${code}`,
    expiry: expiry.toISOString()
  });
});

app.get('/shorturls/:shortcode', (req, res) => {
  const code = req.params.shortcode;
  const urlData = urlDatabase[code];
  if (!urlData) {
    return res.status(404).json({ error: 'Shortcode not found.' });
  }
  const now = new Date();
  if (new Date(urlData.expiry) < now) {
    return res.status(410).json({ error: 'Short link has expired.' });
  }
  const clicks = clickStats[code] || [];
  res.json({
    originalUrl: urlData.originalUrl,
    createdAt: urlData.createdAt,
    expiry: urlData.expiry,
    totalClicks: clicks.length,
    clicks: clicks
  });
});

app.get('/:shortcode', (req, res) => {
  const code = req.params.shortcode;
  const urlData = urlDatabase[code];
  if (!urlData) {
    return res.status(404).json({ error: 'Shortcode not found.' });
  }
  const now = new Date();
  if (new Date(urlData.expiry) < now) {
    return res.status(410).json({ error: 'Short link has expired.' });
  }
  const click = {
    timestamp: new Date().toISOString(),
    referrer: req.get('referer') || '',
    location: req.ip || 'unknown'
  };
  clickStats[code] = clickStats[code] || [];
  clickStats[code].push(click);
  res.redirect(urlData.originalUrl);
});

app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener Backend Running' });
});

app.listen(PORT, () => {
  const fs = require('fs');
  const logFilePath = path.join(__dirname, '../logging-middleware/access.log');
  fs.appendFileSync(logFilePath, `Server started on port ${PORT} at ${new Date().toISOString()}\n`);
}); 