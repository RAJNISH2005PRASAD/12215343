const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'access.log');

function logToFile(message) {
  fs.appendFileSync(logFilePath, message + '\n', { encoding: 'utf8' });
}

const logger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = `${new Date().toISOString()} | ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | ${duration}ms`;
    logToFile(logEntry);
  });
  next();
};

module.exports = logger; 