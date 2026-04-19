const pool = require('../db');

async function checkCols() {
    try {
        const [rows] = await pool.execute("DESCRIBE users;");
        console.log("USERS TABLE STRUCTURE:");
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error("Error describing users:", error.message);
        process.exit(1);
    }
}

checkCols();
