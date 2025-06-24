// 📁 auth.controller.js
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
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{10,}$")).required(),
  role: Joi.string().valid("child", "parent", "admin").required(),
  birthdate: Joi.date().required(),
  parent_code: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  parent_code: Joi.string().optional(),
});

function createUser({ username, email, hashedPassword, role, birthdate, parent_code, age }, res, parentCodeToInsert) {
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

async function createUserInDb(data, res) {
  const { username, email, password, role, birthdate, parent_code, age } = data;
  const emailCheck = "SELECT * FROM users WHERE email = ?";
  db.query(emailCheck, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length > 0) return res.status(400).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);
    let parentCodeToInsert = null;
    if (role === "parent") parentCodeToInsert = generateParentCode();
    else if (age < 15) parentCodeToInsert = parent_code || null;

    createUser({ username, email, hashedPassword, role, birthdate, parent_code, age }, res, parentCodeToInsert);
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
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password, parent_code } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    if (results.length === 0) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

    const age = getAgeFromBirthdate(user.birthdate);
    if (age < 15 && user.parent_code && (!parent_code || user.parent_code !== parent_code)) {
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
  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: "Erreur serveur lors de la suppression" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({ message: "Compte supprimé avec succès" });
  });
};

module.exports = { login, register, deleteAccount };