const express = require('express');
const app = express();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const specieRoutes = require('./routes/specieRoutes');

app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/specie', specieRoutes);

module.exports = app;