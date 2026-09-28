const db = require('./db');

const initDb = async () => {
    const queryText = `
    DO $$
    BEGIN
        ENUMS
    END $$;
    `;
    
    try {
        await db.query(queryText);
        console.log(`Database initialized sucessfully.`);
    } catch (error) {
        console.error(`Error initializing the database: ${error}`)
    }
}