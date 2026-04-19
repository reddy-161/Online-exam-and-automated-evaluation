const pool = require('../db');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
    try {
        console.log("Starting Admin Setup...");

        // 1. Update schema
        console.log("Updating users table schema...");
        await pool.execute("ALTER TABLE users MODIFY COLUMN role ENUM('student', 'teacher', 'admin') NOT NULL");
        
        // Check if columns exist before adding
        const [columns] = await pool.execute("SHOW COLUMNS FROM users");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('is_approved')) {
            await pool.execute("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE AFTER is_verified");
            console.log("Added column: is_approved");
        }
        
        if (!columnNames.includes('login_id')) {
            await pool.execute("ALTER TABLE users ADD COLUMN login_id VARCHAR(50) UNIQUE NULL AFTER is_approved");
            console.log("Added column: login_id");
        }

        // 2. Set default is_approved for existing students
        console.log("Setting default approval for students...");
        await pool.execute("UPDATE users SET is_approved = TRUE WHERE role = 'student'");

        // 3. Create Admin User
        const adminEmail = 'srmap2026@gmail.com';
        const adminId = 'SRMAP2026';
        const adminPassword = 'naveen';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const [existingAdmin] = await pool.execute("SELECT * FROM users WHERE email = ? OR login_id = ?", [adminEmail, adminId]);
        
        if (existingAdmin.length === 0) {
            await pool.execute(
                "INSERT INTO users (name, email, login_id, password_hash, role, is_verified, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ['Admin', adminEmail, adminId, hashedPassword, 'admin', true, true]
            );
            console.log("Admin user created successfully.");
        } else {
            // Update existing admin if details changed
            await pool.execute(
                "UPDATE users SET password_hash = ?, login_id = ?, role = 'admin', is_verified = true, is_approved = true WHERE email = ?",
                [hashedPassword, adminId, adminEmail]
            );
            console.log("Admin user updated successfully.");
        }

        console.log("Migration and Admin setup completed!");
        process.exit(0);
    } catch (error) {
        console.error("Migration error:", error);
        process.exit(1);
    }
}

setupAdmin();
