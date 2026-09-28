const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// routes

module.exports = app;