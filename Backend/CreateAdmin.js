// ================= createAdmin.js =================
// Run this ONCE to create (or reset) an admin account with a properly
// bcrypt-hashed password. Usage:
//
//   node createAdmin.js <admin_id> <password> <name>
//
// Example:
//   node createAdmin.js admin001 MySecurePass123 "Super Admin"

require("dotenv").config();
const mysql  = require("mysql2");
const bcrypt = require("bcrypt");

const [, , admin_id, plainPassword, name] = process.argv;

if (!admin_id || !plainPassword) {
  console.error("Usage: node createAdmin.js <admin_id> <password> [name]");
  process.exit(1);
}

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect(async (err) => {
  if (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(plainPassword, 10);

    // If the admin_id already exists, update its password instead of
    // failing on the UNIQUE constraint. Otherwise insert a new row.
    db.query(
      "SELECT id FROM admins WHERE admin_id=?",
      [admin_id],
      (err, rows) => {
        if (err) {
          console.error("Query failed:", err.message);
          db.end();
          process.exit(1);
        }

        if (rows.length) {
          db.query(
            "UPDATE admins SET password=?, name=? WHERE admin_id=?",
            [hash, name || "Admin", admin_id],
            (err) => {
              if (err) console.error("Update failed:", err.message);
              else console.log(`✅ Password updated for admin_id "${admin_id}"`);
              db.end();
            }
          );
        } else {
          db.query(
            "INSERT INTO admins (admin_id, password, name) VALUES (?,?,?)",
            [admin_id, hash, name || "Admin"],
            (err) => {
              if (err) console.error("Insert failed:", err.message);
              else console.log(`✅ Admin "${admin_id}" created successfully`);
              db.end();
            }
          );
        }
      }
    );
  } catch (e) {
    console.error("Hashing failed:", e.message);
    db.end();
    process.exit(1);
  }
});