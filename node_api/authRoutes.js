import express from 'express';
import bcrypt from 'bcrypt';

const router = express.Router(); 
const saltRounds = 10; // Niveau de sécurité pour le hachage des mots de passe


// -------------------------------------------------------------------
// ROUTE POST /api/auth/register : INSCRIPTION D'UN NOUVEL UTILISATEUR
// -------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const db = req.db; 
  // Récupération des données du formulaire Vue.js, incluant is_owner
  const { username, email, password, is_owner } = req.body; 

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Veuillez remplir tous les champs obligatoires.' });
  }

  // 1. Vérification de l'existence de l'email (colonne UNIQUE)
  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error("Erreur BDD lors de la vérification de l'email:", err);
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
    
    if (results.length > 0) {
      // Email déjà utilisé
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé. Veuillez vous connecter.' });
    }

    // 2. Hachage sécurisé du mot de passe
    try {
      const password_hash = await bcrypt.hash(password, saltRounds);

      // 3. Insertion dans la table 'users'
      // apartment_id est NULL par défaut.
      // is_owner vient directement de la checkbox du front-end
      const sql = `INSERT INTO users (username, email, password_hash, is_owner) 
                   VALUES (?, ?, ?, ?)`;
      
      db.query(sql, [username, email, password_hash, is_owner], (err, result) => {
        if (err) {
          console.error("Erreur BDD lors de l'insertion:", err);
          return res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de l\'utilisateur.' });
        }
        
        // Succès : Répond avec un statut 201 (Created)
        res.status(201).json({ 
          success: true, 
          message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.',
          user_id: result.insertId 
        });
      });

    } catch (hashError) {
      console.error("Erreur lors du hachage du mot de passe:", hashError);
      res.status(500).json({ success: false, message: 'Erreur de sécurité interne.' });
    }
  });
});

// -------------------------------------------------------------------
// ROUTE POST /api/auth/login : CONNEXION D'UN UTILISATEUR
// -------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const db = req.db; 
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Veuillez fournir un email et un mot de passe.' });
  }

  // 1. Rechercher l'utilisateur par son email
  const sql = 'SELECT id, email, password_hash, username, is_owner FROM users WHERE email = ?';

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Erreur BDD lors de la recherche de l'utilisateur:", err);
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }

    if (results.length === 0) {
      // Utilisateur non trouvé
      return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
    }

    const user = results[0];
    
    // 2. Comparer le mot de passe fourni avec le hachage stocké
    try {
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        // Le mot de passe ne correspond pas
        return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
      }

      // 3. Succès de la connexion !
      
      // En production, il faut générer un JWT (JSON Web Token) réel ici
      const token = 'fake-jwt-token-' + user.id; 

      // Répondre avec les informations de l'utilisateur et le token
      res.status(200).json({ 
        success: true, 
        message: 'Connexion réussie.',
        token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          is_owner: user.is_owner 
        }
      });
      
    } catch (compareError) {
      console.error("Erreur lors de la comparaison des mots de passe:", compareError);
      return res.status(500).json({ success: false, message: 'Erreur de sécurité interne.' });
    }
  });
});

// IMPORTANT : Exportation par défaut du routeur pour l'utilisation dans server.js
export default router;