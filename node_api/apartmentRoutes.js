import express from 'express';

const router = express.Router(); 

router.put('/toggle-check/:id', (req, res) => {
    const db = req.db;
    const apartmentId = req.params.id;
    // La nouvelle valeur de to_check (0 ou 1) est envoyée dans le corps de la requête
    const { newStatus } = req.body; 

    // 1. Validation
    if (newStatus === undefined || (newStatus !== 0 && newStatus !== 1)) {
        return res.status(400).json({ success: false, message: 'Le statut est requis et doit être 0 ou 1.' });
    }

    // 2. Requête SQL de mise à jour
    const sql = 'UPDATE apartments SET to_check = ? WHERE id = ?';
    
    db.query(sql, [newStatus, apartmentId], (err, result) => {
        if (err) {
            console.error("Erreur BDD lors de la mise à jour de to_check:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé.' });
        }

        res.status(200).json({ 
            success: true, 
            message: `Statut to_check mis à jour pour l'appartement ${apartmentId}.`
        });
    });
});

//------------------------------------------------------
// ROUTE POST /api/apartments/add : AJOUT ET LIAISON DE L'APPARTEMENT
// -------------------------------------------------------------------
router.post('/add', async (req, res) => {
    const db = req.db; 
    
    // Récupération des données. user_id est maintenant owner_id dans la BDD
    const { address, city, inventory, to_check, user_id } = req.body; 

    if (!user_id) {
         return res.status(401).json({ success: false, message: 'ID utilisateur manquant. Authentification requise.' });
    }
    if (!address || !city) {
        return res.status(400).json({ success: false, message: 'L\'adresse et la ville sont obligatoires.' });
    }

    // 1. REQUÊTE SQL : Insertion de l'appartement avec son propriétaire (owner_id)
    // Nous avons retiré is_active et postcode
    const insertApartmentSql = `
        INSERT INTO apartments (address, city, inventory, to_check, owner_id) 
        VALUES (?, ?, ?, ?, ?)
    `;
    const apartmentValues = [
        address, 
        city, 
        JSON.stringify(inventory), 
        to_check,
        user_id // <-- L'ID de l'utilisateur va dans la colonne owner_id de l'appartement
    ];
    
    db.query(insertApartmentSql, apartmentValues, (err, apartmentResult) => {
        if (err) {
            console.error("Erreur insertion appartement:", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de l\'appartement.' });
        }
        
        // 2. SUCCÈS : Fin de la transaction. Pas d'UPDATE sur la table users.
        res.status(201).json({ 
            success: true, 
            message: 'Appartement enregistré avec succès !',
            apartment_id: apartmentResult.insertId
        });
    });
});

// ... (Votre route GET /user/:id doit également être mise à jour) ...

// -------------------------------------------------------------------
// MISE À JOUR : ROUTE GET /api/apartments/user/:id (pour le Dashboard)
// -------------------------------------------------------------------
router.get('/user/:id', (req, res) => {
    const db = req.db;
    const userId = req.params.id;

    // Sélectionne tous les appartements dont la colonne owner_id correspond à l'ID de l'utilisateur
    const sql = `SELECT * FROM apartments WHERE owner_id = ?`;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération des appartements:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }
        
        res.status(200).json({ 
            success: true, 
            apartments: results 
        });
    });
});

router.get('/to-check-by-user/:id', (req, res) => {
    const db = req.db;
    const userId = req.params.id; // ID du locataire/utilisateur non-owner

    // Jointure pour trouver les appartements des propriétaires liés
    const sql = `
        SELECT 
            a.id, a.address, a.city, a.to_check, 
            u_owner.username AS owner_username, 
            u_owner.id AS owner_id
        FROM apartments a
        JOIN users u_owner ON a.owner_id = u_owner.id         
        JOIN user_relations ur ON ur.related_user_id = u_owner.id
        WHERE ur.user_id = ? 
        AND a.to_check = TRUE; -- Filtre les appartements qui ont besoin d'être vérifiés
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération des appartements à vérifier:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }
        
        res.status(200).json({ 
            success: true, 
            apartments: results 
        });
    });
});

export default router;