import mysql from 'mysql2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// import 'dotenv/config'; // Décommentez si vous utilisez un fichier .env

// Pour avoir __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 1. Configuration de la Connexion ---
// NOTE: Utilisez les mêmes identifiants que dans server.js.
// On se connecte SANS spécifier la base de données au début.
const dbConfig = {
    host:  'localhost',
    user:  'root', // ⚠️ VOTRE utilisateur MySQL
    password:  'root', // ⚠️ VOTRE mot de passe
    port:  3306,
    multipleStatements: true,
};
const DB_NAME = 'fixmate_db';

// ---  Fonction pour nettoyer le dossier uploads ---
function cleanUploadsFolder() {
    const uploadsPath = path.join(__dirname, 'uploads');
    
    console.log('🧹 Nettoyage du dossier uploads...');
    
    if (fs.existsSync(uploadsPath)) {
        // Supprimer tous les sous-dossiers et fichiers
        const folders = fs.readdirSync(uploadsPath);
        
        for (const folder of folders) {
            const folderPath = path.join(uploadsPath, folder);
            
            if (fs.statSync(folderPath).isDirectory()) {
                // Supprimer tous les fichiers dans le dossier
                const files = fs.readdirSync(folderPath);
                for (const file of files) {
                    fs.unlinkSync(path.join(folderPath, file));
                }
                // Supprimer le dossier vide
                fs.rmdirSync(folderPath);
                console.log(`  ✅ Dossier supprimé: ${folder}`);
            }
        }
        
        console.log('✅ Dossier uploads nettoyé !');
    } else {
        // Créer le dossier uploads s'il n'existe pas
        fs.mkdirSync(uploadsPath);
        console.log('✅ Dossier uploads créé !');
    }
}

// --- 2. Requêtes SQL pour la création des tables ---
// L'ordre est important : les tables sans FK doivent être créées avant celles qui les référencent.
const createTablesSQL = `
    -- Désactive temporairement la vérification des clés étrangères pour les suppressions
    SET FOREIGN_KEY_CHECKS = 0; 

    -- Suppression des tables dans l'ordre inverse des dépendances
    DROP TABLE IF EXISTS history_messages;
    DROP TABLE IF EXISTS user_relations;
    DROP TABLE IF EXISTS photos;    
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

    -- TABLE 5 : photos (Dépend de apartments)
        CREATE TABLE IF NOT EXISTS photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        apartment_id INT NOT NULL,
        photo_url VARCHAR(500) NOT NULL,
        message TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by VARCHAR(100),
        reviewed_at DATETIME NULL,
        reviewed_by VARCHAR(100),
        feedback TEXT,
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
        INDEX idx_apartment (apartment_id),
        INDEX idx_status (status),
        INDEX idx_uploaded_at (uploaded_at)
    );

    -- Réactive la vérification des clés étrangères
    SET FOREIGN_KEY_CHECKS = 1; 
`;

// --- 3. Fonction principale d'initialisation ---
async function setupDatabase() {
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 INITIALISATION DE LA BASE DE DONNÉES');
    console.log('═══════════════════════════════════════════════\n');
    
    // ⭐ IMPORTANT : Nettoyer uploads AVANT de toucher à la DB
    cleanUploadsFolder();
    
    console.log('\n📡 Tentative de connexion à MySQL...');
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
        console.log(`\n🔍 Vérification de la base de données '${DB_NAME}'...`);
        await connection.promise().query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        console.log(`✅ Base de données '${DB_NAME}' assurée.`);

        // 3.2. Sélectionner la base de données
        await connection.promise().query(`USE ${DB_NAME}`);
        console.log(`✅ Sélection de la base de données '${DB_NAME}'.`);

        // 3.3. Exécuter toutes les requêtes de création de tables
        console.log(`\n🏗️  Début de la création des tables...`);
        // La méthode d'exécution de mysql2 permet d'exécuter plusieurs requêtes d'un coup
        const [results] = await connection.promise().query(createTablesSQL);
        
        // Vous pouvez loguer les résultats si vous voulez: console.log(results);
        
        console.log('\n═══════════════════════════════════════════════');
        console.log('🎉 SETUP TERMINÉ AVEC SUCCÈS !');
        console.log('═══════════════════════════════════════════════');
        console.log(`✅ Base de données: ${DB_NAME}`);
        console.log('✅ Tables créées: users, apartments, user_relations, history_messages, photos');
        console.log('✅ Dossier uploads nettoyé');
        console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n═══════════════════════════════════════════════');
        console.error('❌ ERREUR CRITIQUE LORS DU SETUP');
        console.error('═══════════════════════════════════════════════');
        console.error(`Message: ${error.message}`);
        console.error(`Code erreur: ${error.code}`);
        console.error('═══════════════════════════════════════════════\n');
    } finally {
        connection.end();
    }
}

setupDatabase();