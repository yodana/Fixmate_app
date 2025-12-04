<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const userDataString = localStorage.getItem('userData');
const userData = JSON.parse(userDataString);
const userId = userData ? userData.id : null; // Récupère l'ID

const address = ref('');
const city = ref('');
const postcode = ref('');
const inventoryText = ref('1 TV, 1 Canapé, 2 Chaises, 1 Table'); 
const isOwner = ref(true); // Utilisateur connecté est propriétaire ici
const toCheck = ref(false); // NOUVEAU: Statut de vérification, par défaut à false

const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const router = useRouter();

const submitApartment = async () => {
  // 1. Réinitialisation des états
  errorMessage.value = '';
  successMessage.value = '';

  // Validation simple
  if (!address.value || !city.value) {
    errorMessage.value = 'Veuillez remplir au moins l\'adresse et la ville.';
    return;
  }

  // Validation du format JSON de l'inventaire
  let inventoryJson = {};
  try {
    // Sépare chaque élément par une virgule
    const items = inventoryText.value.split(',').map(item => item.trim());
    
    items.forEach(item => {
      const match = item.match(/^(\d+)(.+)$/i);
      if (match) {
        const [, qty, name] = match;
        inventoryJson[name.trim()] = qty.trim();
      } else {
        throw new Error(`Format invalide pour l'article : "${item}"`);
      }
    });

  } catch (e) {
    errorMessage.value = e.message || "Erreur dans l'inventaire.";
    return;
  }

  
  // Création de l'objet de données à envoyer
  const apartmentData = {
    address: address.value,
    city: city.value,
    postcode: postcode.value,
    inventory: inventoryJson,
    is_active: true, // Valeur statique, pourrait venir d'un champ
    to_check: toCheck.value, // NOUVEAU: Envoi du statut de vérification
    user_id: userId,
  };

  // 2. Appel à l'API
  isLoading.value = true;

  try {
    // ----------------------------------------------------
    // APPEL AXIOS VERS L'API
    // ----------------------------------------------------
    const response = await axios.post('http://localhost:3000/api/apartments/add', apartmentData);

    successMessage.value = response.data.message || 'Appartement ajouté avec succès !';

    // 3. Redirection vers le dashboard après 1.5 secondes
    setTimeout(() => {
      router.push('/dashboard'); 
    }, 1500);

  } catch (error) {
    // 4. Gestion des erreurs de l'API
    if (error.response) {
      errorMessage.value = error.response.data.message || 'Erreur lors de l\'ajout de l\'appartement.';
    } else {
      errorMessage.value = 'Erreur réseau. Impossible de contacter le serveur API.';
    }
  } finally {
    // 5. Arrêter l'état de chargement
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="apartment-page">
    <div class="form-container">
      <div class="header">
        <h2>Ajouter un Nouvel Appartement</h2>
        <p class="subtitle">Enregistrez les détails de votre propriété</p>
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

      <form @submit.prevent="submitApartment">
        <div class="form-group">
          <label for="address">Adresse complète</label>
          <input type="text" id="address" v-model="address" required placeholder="123 Rue de la Paix">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="city">Ville</label>
            <input type="text" id="city" v-model="city" required placeholder="Paris">
          </div>

          <div class="form-group">
            <label for="postcode">Code Postal</label>
            <input type="text" id="postcode" v-model="postcode" placeholder="75001">
          </div>
        </div>
        
       <div class="form-group">
        <label for="inventory">Inventaire</label>
        <textarea 
          id="inventory" 
          v-model="inventoryText" 
          rows="5" 
          placeholder="1 TV, 1 Canapé, 2 Chaises, 1 Table">
        </textarea>
        <small class="helper-text">Liste: chiffre puis nom du bien, séparés par des virgules</small>
      </div>

        
        <div class="verification-card">
          <div class="verification-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div class="verification-content">
              <h4>Vérification immédiate</h4>
              <p>Marquer cet appartement pour une vérification prioritaire</p>
            </div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="toCheck">
            <span class="slider"></span>
          </label>
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          <span v-if="!isLoading">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Enregistrer l'Appartement
          </span>
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
            Enregistrement...
          </span>
        </button>

        <router-link to="/dashboard" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour au Dashboard
        </router-link>
      </form>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.apartment-page {
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
  max-width: 640px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #2d3748;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: white;
  color: #2d3748;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #a0aec0;
}

.helper-text {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #718096;
}

/* Verification Card */
.verification-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.verification-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.verification-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.verification-header svg {
  color: #667eea;
  flex-shrink: 0;
}

.verification-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.verification-content p {
  margin: 0;
  font-size: 13px;
  color: #718096;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 56px;
  height: 30px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 30px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .slider:before {
  transform: translateX(26px);
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

/* Back Link */
.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  color: #718096;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #667eea;
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

  .form-row {
    grid-template-columns: 1fr;
  }

  .header h2 {
    font-size: 24px;
  }

  .verification-card {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .verification-header {
    flex-direction: column;
  }
}
</style>