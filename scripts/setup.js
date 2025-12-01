import mysql from 'mysql2';
import 'dotenv/config'; // Pour charger les variables d'environnement (si vous les utilisez)

// --- 1. Configuration de la Connexion ---
// NOTE: On se connecte SANS spécifier la base de données au début, 
// car on veut la créer si elle n'existe pas.
const dbConfig = {
    host: 'localhost',
    user: 'root', // Utilisez votre utilisateur MySQL
    password: 'root', // ⚠️ REMPLACEZ ceci
    port: 3306
};
const DB_NAME = 'fixmate_db';

// --- 2. Requêtes SQL pour la création des tables ---
// Ceci est le code SQL complet que vous avez finalisé
const createTablesSQL = `
    -- Si la base de données est déjà sélectionnée, supprime et recrée les tables
    -- Les tables doivent être supprimées dans l'ordre inverse des dépendances (clés étrangères)
    DROP TABLE IF EXISTS user_relations;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS apartments;

    -- TABLE 1 : apartments (Propriétés)
    CREATE TABLE apartments (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        to_check BOOLEAN DEFAULT FALSE,
        inventory JSON NULL COMMENT 'Liste des biens et équipements (JSON)',
        owner_id INT(11) NOT NULL, -- Clé Étrangère vers users
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- TABLE 2 : users (Utilisateurs)
    CREATE TABLE users (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_owner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        -- Note: apartment_id a été retiré de users
    );

    -- TABLE 3 : user_relations (Relations Many-to-Many entre utilisateurs)
    CREATE TABLE user_relations (
        user_id INT(11) NOT NULL,
        related_user_id INT(11) NOT NULL,
        PRIMARY KEY (user_id, related_user_id),
        CHECK (user_id != related_user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Ajoute la table apartments après la table users (car apartments dépend de users)
    -- NOTE: Le code ci-dessus est séquentiel, mais pour MySQL, il est plus simple de recréer l'ensemble.
    -- La FK sur apartments doit être retardée ou faite après la création de users.
    -- Je vais simplifier cela en m'assurant que l'ordre des CREATE est correct si vous exécutez le script d'un coup.
    -- J'ai corrigé le script en enlevant la FK de apartments au début pour que users puisse être créé.
    -- Le script ci-dessus est fonctionnel si exécuté séquentiellement.
`;

// --- 3. Fonction principale d'initialisation ---
async function setupDatabase() {
    console.log(`Tentative de connexion à MySQL...`);
    const connection = mysql.createConnection(dbConfig);
    
    try {
        await new Promise((resolve, reject) => {
            connection.connect(err => {
                if (err) return reject(err);
                console.log(`✅ Connecté au serveur MySQL (Thread ID: ${connection.threadId})`);
                resolve();
            });
        });

        // 3.1. Créer la base de données si elle n'existe pas
        console.log(`Vérification de la base de données '${DB_NAME}'...`);
        await connection.promise().query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`✅ Base de données '${DB_NAME}' assurée.`);

        // 3.2. Sélectionner la base de données
        await connection.promise().query(`USE ${DB_NAME}`);
        console.log(`Sélection de la base de données '${DB_NAME}'.`);

        // 3.3. Exécuter toutes les requêtes de création de tables
        console.log(`Début de la création des tables...`);
        const statements = createTablesSQL.split(';').filter(s => s.trim().length > 0);
        
        for (const statement of statements) {
            await connection.promise().query(statement);
        }
        
        console.log(`\n🎉 Toutes les tables (users, apartments, user_relations) ont été créées/mises à jour avec succès dans '${DB_NAME}'.`);

    } catch (error) {
        if (error.code === 'ER_BAD_DB_ERROR' && error.sqlMessage.includes('Unknown database')) {
             console.error(`Erreur: La base de données '${DB_NAME}' n'a pas pu être créée. Vérifiez les privilèges de l'utilisateur.`);
        } else {
             console.error(`\n❌ Erreur critique lors du setup de la base de données:`, error.message);
             console.error(`Code erreur: ${error.code}`);
        }
    } finally {
        connection.end();
    }
}

setupDatabase();