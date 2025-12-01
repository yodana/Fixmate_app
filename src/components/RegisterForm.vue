<script setup>
import { ref } from 'vue';
import axios from 'axios'; 
import { useRouter } from 'vue-router'; 

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
// État pour la case à cocher 'is_owner'
const isOwner = ref(false); 

const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false); 

const router = useRouter(); 

const submitRegister = async () => {
  // 1. Réinitialisation des états
  errorMessage.value = '';
  successMessage.value = '';
  
  // Validation simple
  if (!username.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Veuillez remplir tous les champs.';
    return;
  }
  
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.';
    return;
  }

  // Création de l'objet de données à envoyer à l'API
  const userData = {
    username: username.value,
    email: email.value,
    password: password.value,
    is_owner: isOwner.value // Envoi du statut du checkbox
  };

  // 2. Appel à l'API
  isLoading.value = true;

  try {
    // ----------------------------------------------------
    // APPEL AXIOS VERS L'API EXPRESS
    // ----------------------------------------------------
    const response = await axios.post('http://localhost:3000/api/auth/register', userData);

    // Si la réponse est 201 (Créé)
    successMessage.value = response.data.message || 'Inscription réussie !';
    
    // 3. Effacer et réinitialiser le formulaire
    username.value = '';
    email.value = '';
    password.value = '';
    confirmPassword.value = '';
    isOwner.value = false; // Réinitialise le checkbox

    // 4. Redirection vers la connexion après 2 secondes
    setTimeout(() => {
      router.push('/login'); 
    }, 2000);

  } catch (error) {
    // 5. Gestion des erreurs de l'API (409, 400, 500)
    if (error.response) {
        // Erreur reçue de l'API (ex: 409 Conflict - Email déjà utilisé)
        errorMessage.value = error.response.data.message || 'Erreur lors de l\'inscription.';
    } else {
        // Erreur réseau ou API non disponible
        errorMessage.value = 'Erreur réseau. Le serveur API est-il démarré sur le port 3000 ?';
        console.error("Détails de l'erreur réseau:", error);
    }
  } finally {
    // 6. Arrêter l'état de chargement
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="form-container">
    <h2>Inscription</h2>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form @submit.prevent="submitRegister">
      <div class="form-group">
        <label for="register-username">Nom d'utilisateur :</label>
        <input type="text" id="register-username" v-model="username" required>
      </div>

      <div class="form-group">
        <label for="register-email">Email :</label>
        <input type="email" id="register-email" v-model="email" required>
      </div>

      <div class="form-group">
        <label for="register-password">Mot de passe :</label>
        <input type="password" id="register-password" v-model="password" required>
      </div>

      <div class="form-group">
        <label for="confirm-password">Confirmer le mot de passe :</label>
        <input type="password" id="confirm-password" v-model="confirmPassword" required>
      </div>
      
      <div class="form-group owner-checkbox">
        <input 
          type="checkbox" 
          id="is-owner" 
          v-model="isOwner"
        >
        <label for="is-owner" class="checkbox-label">Je suis propriétaire d'un bien immobilier.</label>
      </div>

      <button type="submit" class="submit-button" :disabled="isLoading">
        {{ isLoading ? 'Inscription en cours...' : "S'inscrire" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.form-container {
  max-width: 400px;
  margin: 30px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}
.form-group {
  margin-bottom: 15px;
  text-align: left;
}
label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}
/* Styles spécifiques au checkbox */
.owner-checkbox {
  display: flex;
  align-items: center;
  margin-top: 5px;
  margin-bottom: 20px;
}
.owner-checkbox input[type="checkbox"] {
  width: auto; 
  margin-right: 10px;
}
.owner-checkbox .checkbox-label {
    font-weight: normal;
}
/* Styles du bouton de soumission */
.submit-button {
  background-color: #42b883; 
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  width: 100%;
  transition: background-color 0.3s;
}
.submit-button:disabled {
    background-color: #a5d8b8; 
    cursor: not-allowed;
}
/* Styles des messages */
.error-message {
  color: crimson;
  font-weight: bold;
}
.success-message {
  color: green;
  font-weight: bold;
}
</style>