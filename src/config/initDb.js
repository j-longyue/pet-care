const db = require('./db');

const initDb = async () => {
    const queryText = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('adm', 'mod', 'common');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
            CREATE TYPE user_plan AS ENUM ('free', 'premium', 'vip');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
            CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due');
        END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role user_role DEFAULT 'common' NOT NULL,
        plan user_plan DEFAULT 'free' NOT NULL,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(40) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        plan_status subscription_status DEFAULT 'active' NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deleted_users_log (
        id SERIAL PRIMARY KEY,
        deleted_user_id INTEGER NOT NULL,
        deleted_user_name VARCHAR(100),
        deleted_user_email VARCHAR(100),
        deleted_user_role user_role,
        deleted_by_id INTEGER NOT NULL,
        deleted_by_name VARCHAR(100),
        deleted_by_role user_role,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        specie VARCHAR(100) UNIQUE NOT NULL,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        deleted_by INT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS deleted_species_log (
        id SERIAL PRIMARY KEY,
        deleted_specie_id INT NOT NULL,
        deleted_specie_name VARCHAR(100) NOT NULL,
        deleted_by_id INT,
        deleted_by_name VARCHAR(100),
        deleted_by_role VARCHAR(20),
        deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS pets (
        id SERIAL PRIMARY KEY,
        specie_id INT REFERENCES species(id) ON DELETE SET NULL,
        name VARCHAR(100) NOT NULL,
        pet_picture TEXT,
        birthday DATE,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        deleted_by INT REFERENCES users(id) ON DELETE SET NULL
    );
    `;
    
    try {
        await db.query(queryText);
        console.log(`Database initialized sucessfully.`);
    } catch (error) {
        console.error(`Error initializing the database: ${error}`)
    }
}

module.exports = initDb;