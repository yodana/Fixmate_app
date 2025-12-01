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
const inventoryText = ref('{"TV": "1", "Canapé": "1"}'); 
const isOwner = ref(true); // Utilisateur connecté est propriétaire ici
const toCheck = ref(false); // NOUVEAU: Statut de vérification, par défaut à false

const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const router = useRouter();

const submitApartment = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (!address.value || !city.value) {
    errorMessage.value = 'Veuillez remplir au moins l\'adresse et la ville.';
    return;
  }

  let inventoryJson;
  try {
    inventoryJson = JSON.parse(inventoryText.value);
  } catch (e) {
    errorMessage.value = 'Le format de l\'inventaire (JSON) est invalide.';
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

  isLoading.value = true;

  try {
    // APPEL AXIOS VERS L'API
    const response = await axios.post('http://localhost:3000/api/apartments/add', apartmentData);

    successMessage.value = response.data.message || 'Appartement ajouté avec succès !';

    setTimeout(() => {
      router.push('/dashboard'); 
    }, 1500);

  } catch (error) {
    if (error.response) {
      errorMessage.value = error.response.data.message || 'Erreur lors de l\'ajout de l\'appartement.';
    } else {
      errorMessage.value = 'Erreur réseau. Impossible de contacter le serveur API.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="form-container">
    <h2>Ajouter un Nouvel Appartement</h2>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form @submit.prevent="submitApartment">
      
      <div class="form-group"><label for="address">Adresse complète :</label><input type="text" id="address" v-model="address" required></div>
      <div class="form-group"><label for="city">Ville :</label><input type="text" id="city" v-model="city" required></div>
      <div class="form-group"><label for="postcode">Code Postal :</label><input type="text" id="postcode" v-model="postcode"></div>
      
      <div class="form-group">
        <label for="inventory">Inventaire (format JSON: ex. {"TV": "1"}) :</label>
        <textarea id="inventory" v-model="inventoryText" rows="4"></textarea>
        <small>Format: {"Nom du bien": "Quantité"}</small>
      </div>
      
      <div class="form-group check-checkbox">
        <input 
          type="checkbox" 
          id="to-check" 
          v-model="toCheck"
        >
        <label for="to-check" class="checkbox-label">Marquer pour vérification immédiate.</label>
      </div>

      <button type="submit" class="submit-button" :disabled="isLoading">
        {{ isLoading ? 'Enregistrement...' : 'Enregistrer l\'Appartement' }}
      </button>
      
      <router-link to="/dashboard" class="back-link">Retour au Dashboard</router-link>
    </form>
  </div>
</template>

<style scoped>
/* Les styles restent similaires, ajout du style du checkbox */
.form-container { max-width: 600px; margin: 30px auto; padding: 25px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; }
.form-group { margin-bottom: 15px; text-align: left; }
.check-checkbox { display: flex; align-items: center; margin-top: 5px; margin-bottom: 20px; }
.check-checkbox input[type="checkbox"] { width: auto; margin-right: 10px; }
.check-checkbox .checkbox-label { font-weight: normal; }

label { display: block; margin-bottom: 5px; font-weight: bold; }
input[type="text"], textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.submit-button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; width: 100%; margin-top: 15px; }
.submit-button:disabled { background-color: #a5d8b8; cursor: not-allowed; }
.error-message { color: crimson; font-weight: bold; }
.success-message { color: green; font-weight: bold; }
.back-link { display: block; margin-top: 15px; color: #35495e; text-decoration: none; }
</style>