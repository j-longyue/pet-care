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
        plan_status subscription_status DEFAULT 'active' NOT NULL,
        plan_expires_at TIMESTAMPTZ NULL
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

    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL,
        provider_subscription_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        plan user_plan NOT NULL,
        status subscription_status NOT NULL DEFAULT 'active',
        current_period_end TIMESTAMPTZ NOT NULL,
        canceled_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT subscriptions_provider_key UNIQUE (provider, provider_subscription_id)
    );
 
    CREATE TABLE IF NOT EXISTS payment_events (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(20) NOT NULL,
        event_id VARCHAR(255) NOT NULL,
        type VARCHAR(30) NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT payment_events_key UNIQUE (provider, event_id)
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
        created_by INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        deleted_by INT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pet_access (
        id SERIAL PRIMARY KEY,
        pet_id INT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        can_view BOOLEAN NOT NULL DEFAULT TRUE,
        can_create BOOLEAN NOT NULL DEFAULT FALSE,
        can_edit BOOLEAN NOT NULL DEFAULT FALSE,
        can_delete BOOLEAN NOT NULL DEFAULT FALSE,
        granted_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pet_access_pet_user_key UNIQUE (pet_id, user_id),
        CONSTRAINT pet_access_view_required CHECK (can_view OR NOT (can_create OR can_edit OR can_delete))
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