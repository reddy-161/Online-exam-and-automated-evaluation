const pool = require('../db');

async function updateSchema() {
    try {
        console.log("Checking columns in users table...");
        const [columns] = await pool.execute("SHOW COLUMNS FROM users;");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('section')) {
            console.log("Adding 'section' column...");
            await pool.execute("ALTER TABLE users ADD COLUMN section VARCHAR(10);");
        }

        if (!columnNames.includes('department')) {
            console.log("Adding 'department' column...");
            await pool.execute("ALTER TABLE users ADD COLUMN department VARCHAR(50) DEFAULT 'CSE';");
        }

        console.log("Database schema updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Failed to update schema:", error.message);
        process.exit(1);
    }
}

updateSchema();
