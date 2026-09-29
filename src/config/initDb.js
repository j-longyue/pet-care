const db = require('./db');

const initDb = async () => {
    const queryText = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
            CREATE TYPE user_plan AS ENUM ('free', 'premium', 'vip');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
            CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due');
        END IF;
    END $$;
    `;
    
    try {
        await db.query(queryText);
        console.log(`Database initialized sucessfully.`);
    } catch (error) {
        console.error(`Error initializing the database: ${error}`)
    }
}