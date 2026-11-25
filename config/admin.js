
const db = require("../database/db");
const bcrypt = require("bcryptjs");

const username = "admin";
const password = "Safran@2026!";

const existingAdmin = db.prepare(
  "SELECT id FROM admins WHERE username = ?"
).get(username);

if (!existingAdmin) {
  const passwordHash = bcrypt.hashSync(password, 12);

  db.prepare(
    "INSERT INTO admins (username, password_hash) VALUES (?, ?)"
  ).run(username, passwordHash);
}

module.exports = { username };
