const express = require('express');
const app = express();
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const specieRoutes = require('./routes/specieRoutes');
const petRoutes = require('./routes/petRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

app.use(express.json());

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/specie', specieRoutes);
app.use('/pet', petRoutes);
app.use('/subscription', subscriptionRoutes);

app.use(errorMiddleware);

module.exports = app;