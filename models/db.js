const mysql = require("mysql2");
const dotenv = require("dotenv");

// Charger les variables d'environnement
dotenv.config();

// Choix dynamique selon présence de MYSQL_URL (Railway)
const db = process.env.MYSQL_URL
  ? mysql.createConnection(process.env.MYSQL_URL) // Railway
  : mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

// Connexion
db.connect((err) => {
  if (err) {
    console.error("❌ Erreur de connexion MySQL :", err.message);
    process.exit(1);
  } else {
    console.log("✅ Connecté à la base de données MySQL");
  }
});

module.exports = db;
