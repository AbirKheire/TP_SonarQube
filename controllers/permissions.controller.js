const db = require("../models/db");

// GET /api/permissions
const getAllPermissions = (req, res) => {
  db.query("SELECT * FROM permissions", (err, results) => {
    if (err) return res.status(500).json({ error: "Erreur serveur" });
    res.json(results);
  });
};

// POST /api/permissions
const createPermission = (req, res) => {
  const { can_view_emotions, can_view_progress, can_post_forum, can_edit_modules } = req.body;
  const sql = `
    INSERT INTO permissions (can_view_emotions, can_view_progress, can_post_forum, can_edit_modules)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [can_view_emotions, can_view_progress, can_post_forum, can_edit_modules], (err, result) => {
    if (err) return res.status(500).json({ error: "Erreur lors de la création" });
    res.status(201).json({ message: "Permission créée", id: result.insertId });
  });
};

module.exports = { getAllPermissions, createPermission };
