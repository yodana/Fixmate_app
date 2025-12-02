import mysql from 'mysql2';
// import 'dotenv/config'; // Décommentez si vous utilisez un fichier .env

// --- 1. Configuration de la Connexion ---
// NOTE: Utilisez les mêmes identifiants que dans server.js.
// On se connecte SANS spécifier la base de données au début.
const dbConfig = {
    host:  'localhost',
    user:  'root', // ⚠️ VOTRE utilisateur MySQL
    password:  'root', // ⚠️ VOTRE mot de passe
    port:  3306
};
const DB_NAME = 'fixmate_db';

// --- 2. Requêtes SQL pour la création des tables ---
// L'ordre est important : les tables sans FK doivent être créées avant celles qui les référencent.
const createTablesSQL = `
    -- Désactive temporairement la vérification des clés étrangères pour les suppressions
    SET FOREIGN_KEY_CHECKS = 0; 

    -- Suppression des tables dans l'ordre inverse des dépendances
    DROP TABLE IF EXISTS history_messages;
    DROP TABLE IF EXISTS user_relations;
    DROP TABLE IF EXISTS apartments;
    DROP TABLE IF EXISTS users; 

    -- TABLE 1 : users (Le parent principal)
    CREATE TABLE users (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_owner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- TABLE 2 : apartments (Dépend de users pour owner_id)
    CREATE TABLE apartments (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        inventory JSON NULL COMMENT 'Liste des biens et équipements',
        to_check BOOLEAN DEFAULT FALSE,
        
        -- Clé Étrangère vers le propriétaire (users)
        owner_id INT(11) NOT NULL, 
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_owner_id 
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- TABLE 3 : user_relations (Dépend de users pour user_id et related_user_id)
    CREATE TABLE user_relations (
        user_id INT(11) NOT NULL,
        related_user_id INT(11) NOT NULL,
        
        PRIMARY KEY (user_id, related_user_id),
        
        CHECK (user_id != related_user_id),
        
        CONSTRAINT fk_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_related_user_id 
            FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- TABLE 4 : history_messages (Dépend de apartments et users)
    CREATE TABLE history_messages (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        apartment_id INT(11) NOT NULL,
        sender_id INT(11) NULL, 
        message_content TEXT NOT NULL, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_apartment_history 
            FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
        CONSTRAINT fk_sender_history 
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Réactive la vérification des clés étrangères
    SET FOREIGN_KEY_CHECKS = 1; 
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
        // La méthode d'exécution de mysql2 permet d'exécuter plusieurs requêtes d'un coup
        const [results] = await connection.promise().query(createTablesSQL);
        
        // Vous pouvez loguer les résultats si vous voulez: console.log(results);
        
        console.log(`\n🎉 Toutes les tables ont été créées/mises à jour avec succès dans '${DB_NAME}'.`);

    } catch (error) {
        console.error(`\n❌ Erreur critique lors du setup de la base de données:`, error.message);
        console.error(`Code erreur: ${error.code}`);
    } finally {
        connection.end();
    }
}

setupDatabase();