import express from 'express';
import cors from 'cors';
import mysql from 'mysql2'; 
import authRoutes from './authRoutes.js'; // Vos routes d'authentification
import apartmentRoutes from './apartmentRoutes.js'; // Vos routes d'authentification
import usersRoutes from './usersRoutes.js'; // Vos routes d'authentification

const app = express();
const port = 3000;

// 2. --- Configuration de la connexion MySQL ---
const db = mysql.createConnection({
  host: 'localhost',      
  user: 'root',           // Utilisez votre nouvel utilisateur créé
  password: 'root', // ⚠️ REMPLACER par le mot de passe de 'admin_vue'
  database: 'fixmate_db' ,     // Le nom de votre base de données
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      // Pour les colonnes TINYINT(1) (souvent utilisées pour les booléens)
      const value = field.string();
      // Si la valeur est '1' ou '0', retourne le nombre.
      return value === null ? null : (value === '1' ? 1 : 0);
    }
    return next();
  }
});

// 3. Tester et établir la connexion
db.connect(err => {
  if (err) {
    console.error('Erreur FATALE de connexion à la BDD : ' + err.stack);
    // Si la connexion à la BDD échoue, il est préférable d'arrêter l'API
    return;
  } else {
    console.log('✅ Connecté à la BDD MySQL sous l\'ID ' + db.threadId);
  }
});

// 4. --- Middlewares Globaux ---
app.use(cors()); // Permet à Vue.js de faire des requêtes
app.use(express.json()); // Permet à Express de lire les corps de requête JSON (POST)

// 5. Rendre la connexion DB disponible aux routes
// Ce middleware ajoute l'objet de connexion 'db' à l'objet 'req' (requête)
app.use((req, res, next) => {
    req.db = db; // Maintenant, toutes les routes peuvent accéder à la BDD via req.db
    next();
});

// 6. --- Déclaration des Routes Logiques ---
// Toutes les routes définies dans authRoutes seront préfixées par '/api/auth'
app.use('/api/auth', authRoutes); 
app.use('/api/apartments', apartmentRoutes);
app.use('/api/users', usersRoutes);

// Exemple de route de base pour vérifier que l'API fonctionne
app.get('/api/status', (req, res) => {
    res.json({ message: 'API Express en ligne.', db_status: db.threadId ? 'Connectée' : 'Déconnectée' });
});

// 7. Démarrer le serveur
app.listen(port, () => {
  console.log(`🚀 API backend démarrée sur http://localhost:${port}`);
});

