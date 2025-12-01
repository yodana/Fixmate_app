import express from 'express';

const router = express.Router(); 

// -------------------------------------------------------------------
// ROUTE GET /api/users/owners : Récupère la liste des propriétaires
// -------------------------------------------------------------------
router.get('/owners', (req, res) => {
    const db = req.db;
    // Sélectionne l'ID et le username des utilisateurs marqués comme propriétaires
    const sql = 'SELECT id, username FROM users WHERE is_owner = TRUE';

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération des propriétaires:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }
        res.status(200).json({ success: true, owners: results });
    });
});

// -------------------------------------------------------------------
// ROUTE POST /api/users/link-owner : Ajout d'une relation locataire/propriétaire
// -------------------------------------------------------------------
router.post('/link-owner', (req, res) => {
    const db = req.db;
    const { user_id, owner_id } = req.body; // user_id = locataire, owner_id = le propriétaire à lier

    if (!user_id || !owner_id) {
        return res.status(400).json({ success: false, message: 'ID utilisateur et ID propriétaire sont requis.' });
    }

    // 1. Vérifier si la relation existe déjà
    const checkSql = 'SELECT * FROM user_relations WHERE user_id = ? AND related_user_id = ?';
    db.query(checkSql, [user_id, owner_id], (checkErr, checkResults) => {
        if (checkErr) {
            return res.status(500).json({ success: false, message: 'Erreur de vérification de relation.' });
        }

        if (checkResults.length > 0) {
            return res.status(409).json({ success: false, message: 'Relation déjà établie.' });
        }

        // 2. Insérer la nouvelle relation dans la table de jointure
        const insertSql = 'INSERT INTO user_relations (user_id, related_user_id) VALUES (?, ?)';
        db.query(insertSql, [user_id, owner_id], (insertErr, result) => {
            if (insertErr) {
                console.error("Erreur BDD insertion relation:", insertErr);
                return res.status(500).json({ success: false, message: 'Erreur lors de la liaison.' });
            }

            res.status(201).json({ success: true, message: 'Liaison établie avec succès.' });
        });
    });
});

export default router;