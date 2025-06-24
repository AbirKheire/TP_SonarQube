const db = require("../models/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const Joi = require("joi");
const { getAgeFromBirthdate } = require("../utils/utils");

dotenv.config();

function generateParentCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string()
    .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{10,}$"))
    .message("Le mot de passe doit contenir au moins 10 caractères, une majuscule, un chiffre et un caractère spécial.")
    .required(),
  role: Joi.string().valid("enfant", "ado", "parent", "autre").required(),
  birthdate: Joi.date().iso().required(),
  parent_code: Joi.string().optional().allow(null, ''),
});

function insertUserIntoDb(userData, hashedPassword, parentCodeToInsert, res) {
  const { username, email, role, birthdate } = userData;
  const sql = "INSERT INTO users (username, email, password, role, birthdate, parent_code) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(sql, [username, email, hashedPassword, role, birthdate, parentCodeToInsert], (err, result) => {
    if (err) return res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
    const token = jwt.sign({ id: result.insertId, role }, process.env.JWT_SECRET, { expiresIn: "6h" });
    res.status(201).json({
      message: "Utilisateur créé",
      userId: result.insertId,
      token,
      ...(parentCodeToInsert ? { parent_code: parentCodeToInsert } : {})
    });
  });
}

async function createUserInDb({ username, email, password, role, birthdate, parent_code, age }, res) {
  const emailCheck = "SELECT * FROM users WHERE email = ?";
  db.query(emailCheck, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length > 0) return res.status(400).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    let parentCodeToInsert = null;
    if (role === "parent") parentCodeToInsert = generateParentCode();
    else if (age < 15) parentCodeToInsert = parent_code || null;

    insertUserIntoDb({ username, email, role, birthdate }, hashedPassword, parentCodeToInsert, res);
  });
}

const register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { username, email, password, role, birthdate, parent_code } = req.body;
  const age = getAgeFromBirthdate(birthdate);

  if (age < 15 && !parent_code) {
    return res.status(403).json({ error: "Les utilisateurs de moins de 15 ans doivent être créés avec un code parent." });
  }

  if (age < 15) {
    const parentCheck = "SELECT * FROM users WHERE parent_code = ? AND role = 'parent'";
    db.query(parentCheck, [parent_code], (err, parentResults) => {
      if (err) return res.status(500).json({ error: "Erreur lors de la vérification du code parent" });
      if (parentResults.length === 0) {
        return res.status(400).json({ error: "Code parent invalide ou inexistant" });
      }
      createUserInDb({ username, email, password, role, birthdate, parent_code, age }, res);
    });
  } else {
    createUserInDb({ username, email, password, role, birthdate, parent_code, age }, res);
  }
};

const login = (req, res) => {
  const { email, password, parent_code } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length === 0) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const isUnderage = getAgeFromBirthdate(user.birthdate) < 15;
    const needsParentCode = isUnderage && user.parent_code;
    const invalidParentCode = needsParentCode && (!parent_code || user.parent_code !== parent_code);

    if (invalidParentCode) {
      return res.status(403).json({ error: "Code parental requis ou incorrect" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "6h" });
    res.json({
      message: "Connexion réussie",
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  });
};

const deleteAccount = (req, res) => {
  const userId = req.user.id;
  db.query("DELETE FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json({ error: "Erreur serveur lors de la suppression" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ message: "Compte supprimé avec succès" });
  });
};

module.exports = { login, register, deleteAccount };
