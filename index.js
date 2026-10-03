require('dotenv').config();
const app = require('./src/app');
const initDb = require('./src/config/initDb');
const { startExpirationJob } = require('./src/services/subscriptionService');

const PORT = process.env.PORT;

const startServer = async () => {
    await initDb();

    startExpirationJob();

    app.listen(PORT, () => {
        console.log(`Server running successfully at http://localhost:${PORT}`);
    });
};

startServer();