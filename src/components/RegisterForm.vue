<script setup>
import { ref } from 'vue';
import axios from 'axios'; 
import { useRouter } from 'vue-router'; 

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
// État pour la sélection du rôle utilisateur
const userRole = ref('cleaner'); // 'cleaner' ou 'owner'

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
    is_owner: userRole.value === 'owner' // Conversion du rôle en booléen is_owner
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
    userRole.value = 'cleaner'; // Réinitialise le rôle par défaut

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
  <div class="registration-page">
    <div class="form-container">
      <div class="header">
        <h2>Créer un compte</h2>
        <p class="subtitle">Rejoignez notre plateforme de gestion immobilière</p>
      </div>
      
      <div v-if="errorMessage" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="alert alert-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        {{ successMessage }}
      </div>

      <form @submit.prevent="submitRegister">
        <!-- Role Selection -->
        <div class="role-selection">
          <label class="role-label">Je suis :</label>
          <div class="role-cards">
            <div 
              class="role-card" 
              :class="{ active: userRole === 'cleaner' }"
              @click="userRole = 'cleaner'"
            >
              <div class="role-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12h4l3 9 4-18 3 9h4"></path>
                </svg>
              </div>
              <h3>Cleaner</h3>
              <p>Je propose mes services de ménage</p>
              <div class="check-mark">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <div 
              class="role-card" 
              :class="{ active: userRole === 'owner' }"
              @click="userRole = 'owner'"
            >
              <div class="role-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <h3>Property Manager</h3>
              <p>Je gère des biens immobiliers</p>
              <div class="check-mark">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="register-username">Nom d'utilisateur</label>
          <input type="text" id="register-username" v-model="username" required placeholder="Entrez votre nom d'utilisateur">
        </div>

        <div class="form-group">
          <label for="register-email">Adresse email</label>
          <input type="email" id="register-email" v-model="email" required placeholder="exemple@email.com">
        </div>

        <div class="form-group">
          <label for="register-password">Mot de passe</label>
          <input type="password" id="register-password" v-model="password" required placeholder="Minimum 8 caractères">
        </div>

        <div class="form-group">
          <label for="confirm-password">Confirmer le mot de passe</label>
          <input type="password" id="confirm-password" v-model="confirmPassword" required placeholder="Retapez votre mot de passe">
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          <span v-if="!isLoading">S'inscrire</span>
          <span v-else class="loading">
            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            Inscription en cours...
          </span>
        </button>

        <div class="login-link">
          Vous avez déjà un compte ? <router-link to="/login">Se connecter</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.registration-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.form-container {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h2 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: #1a202c;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #718096;
  font-size: 14px;
}

/* Role Selection */
.role-selection {
  margin-bottom: 28px;
}

.role-label {
  display: block;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 15px;
  color: #2d3748;
}

.role-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.role-card {
  position: relative;
  padding: 20px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  text-align: center;
}

.role-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.role-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.role-icon {
  margin-bottom: 12px;
  color: #667eea;
}

.role-card.active .role-icon {
  animation: bounce 0.5s ease;
}

.role-card h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.role-card p {
  margin: 0;
  font-size: 12px;
  color: #718096;
  line-height: 1.4;
}

.check-mark {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.role-card.active .check-mark {
  opacity: 1;
  transform: scale(1);
}

.check-mark svg {
  color: white;
}

/* Alerts */
.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  font-size: 14px;
  animation: slideIn 0.3s ease;
}

.alert-error {
  background: #fee;
  color: #c53030;
  border: 1px solid #fc8181;
}

.alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #86efac;
}

/* Form Groups */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #2d3748;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: white;
  color: #2d3748;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input::placeholder {
  color: #a0aec0;
}

/* Submit Button */
.submit-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Login Link */
.login-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #718096;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.login-link a:hover {
  color: #764ba2;
  text-decoration: underline;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .form-container {
    padding: 28px 24px;
  }

  .role-cards {
    grid-template-columns: 1fr;
  }

  .header h2 {
    font-size: 24px;
  }
}
</style>