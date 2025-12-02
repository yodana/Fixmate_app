import express from 'express';

const router = express.Router(); 

router.get('/:id', (req, res) => {
    const db = req.db;
    const apartmentId = req.params.id;

    // Sélectionne toutes les colonnes de l'appartement (y compris l'inventaire)
    const sql = 'SELECT * FROM apartments WHERE id = ?';

    db.query(sql, [apartmentId], (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération des détails:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Appartement non trouvé.' });
        }

        // L'inventaire (JSON) est stocké comme une chaîne. Nous le parons avant de l'envoyer.
        const apartment = results[0];
        if (apartment.to_check instanceof Buffer) {
            // Le Buffer 30 correspond à '0' (FALSE), le Buffer 31 correspond à '1' (TRUE).
            // Buffer.toString() retourne '0' ou '1', et on le parse en entier.
            apartment.to_check = parseInt(apartment.to_check.toString('utf8'), 10);
        }
        console.log(apartment);
        try {
            apartment.inventory = JSON.parse(apartment.inventory);
        } catch (e) {
            // Laisse l'inventaire comme chaîne si le parsing échoue
        }

        res.status(200).json({ 
            success: true, 
            apartment: apartment 
        });
    });
});

router.put('/log-check/:id', (req, res) => {
    const db = req.db;
    const apartmentId = req.params.id;
    const { newStatus, message, sender_id } = req.body;

    // 1. Mise à jour de l'appartement
    const updateSql = 'UPDATE apartments SET to_check = ? WHERE id = ?';
    
    db.query(updateSql, [newStatus, apartmentId], (err, result) => {
        if (err) {
            console.error("Erreur BDD lors de la mise à jour de 'to_check':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut de l\'appartement.' });
        }

        // Si l'appartement est mis à jour, on enregistre l'historique
        if (result.affectedRows === 1) {
            // 2. Insertion dans l'historique des messages
            const historySql = 'INSERT INTO history_messages (apartment_id, sender_id, message_content) VALUES (?, ?, ?)';
            
            db.query(historySql, [apartmentId, sender_id, message], (err, historyResult) => {
                if (err) {
                    // C'est ici que l'on voudrait faire un ROLLBACK en cas de transaction.
                    // Pour l'instant, nous loguons l'erreur, l'appartement est mis à jour mais l'historique a échoué.
                    console.error("ALERTE: Mise à jour réussie mais ERREUR BDD lors de l'insertion de l'historique:", err);
                    return res.status(200).json({ 
                        success: true, 
                        message: "Statut mis à jour, mais l'enregistrement de l'historique a échoué.",
                        statusUpdateOk: true,
                        historyUpdateOk: false
                    });
                }

                // Succès des deux opérations
                res.status(200).json({ 
                    success: true, 
                    message: 'Statut de l\'appartement et historique mis à jour avec succès.' 
                });
            });
        } else {
            res.status(404).json({ success: false, message: 'Appartement non trouvé pour la mise à jour.' });
        }
    });
});

router.get('/:id/history', (req, res) => {
    const db = req.db;
    const apartmentId = req.params.id;

    // Jointure pour récupérer le nom d'utilisateur (username) de l'expéditeur (sender)
    const sql = `
        SELECT 
            hm.id, 
            hm.message_content, 
            hm.created_at, 
            u.username AS sender_username
        FROM history_messages hm
        LEFT JOIN users u ON hm.sender_id = u.id
        WHERE hm.apartment_id = ?
        ORDER BY hm.created_at DESC; -- Affiche le plus récent en premier
    `;

    db.query(sql, [apartmentId], (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération de l'historique:", err);
            return res.status(500).json({ success: false, message: "Erreur serveur lors de l'accès à l'historique." });
        }
        
        res.status(200).json({ 
            success: true, 
            history: results 
        });
    });
});

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
        
        // FIX : Conversion du Buffer en Nombre pour to_check
        const fixedApartments = results.map(apartment => {
            if (apartment.to_check instanceof Buffer) {
                // Convertit Buffer '0' ou '1' en nombre 0 ou 1
                apartment.to_check = parseInt(apartment.to_check.toString('utf8'), 10);
            }
            // Assure que l'inventaire est un objet parsé (si nécessaire, selon votre configuration)
            if (typeof apartment.inventory === 'string') {
                try {
                    apartment.inventory = JSON.parse(apartment.inventory);
                } catch (e) { /* ignore parse error */ }
            }
            return apartment;
        });

        res.status(200).json({ 
            success: true, 
            apartments: fixedApartments // Renvoie la liste corrigée
        });
    });
});

router.get('/to-check-by-user/:id', (req, res) => {
    const db = req.db;
    const userId = req.params.id; // ID du locataire/utilisateur non-owner

    // Jointure pour trouver les appartements à vérifier des propriétaires liés
    const sql = `
        SELECT 
            a.id, a.address, a.city, a.to_check, 
            u_owner.username AS owner_username, 
            u_owner.id AS owner_id
        FROM apartments a
        JOIN users u_owner ON a.owner_id = u_owner.id         
        JOIN user_relations ur ON ur.related_user_id = u_owner.id
        WHERE ur.user_id = ? 
        AND a.to_check = TRUE; -- Filtre les appartements qui ont besoin d'être vérifiés (TRUE = 1)
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Erreur BDD lors de la récupération des appartements à vérifier:", err);
            return res.status(500).json({ success: false, message: 'Erreur serveur.' });
        }

        // FIX : Conversion du Buffer en Nombre pour to_check (essentiel pour le locataire)
        const fixedApartments = results.map(apartment => {
            if (apartment.to_check instanceof Buffer) {
                // Convertit Buffer '0' ou '1' en nombre 0 ou 1
                apartment.to_check = parseInt(apartment.to_check.toString('utf8'), 10);
            }
            return apartment;
        });
        
        res.status(200).json({ 
            success: true, 
            apartments: fixedApartments // Renvoyer la liste corrigée
        });
    });
});

export default router;