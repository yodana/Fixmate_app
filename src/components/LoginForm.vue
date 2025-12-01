<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const router = useRouter();

const submitLogin = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  
  if (!email.value || !password.value) {
    errorMessage.value = 'Veuillez remplir tous les champs.';
    return;
  }

  const loginData = {
    email: email.value,
    password: password.value,
  };

  isLoading.value = true;

  try {
    // APPEL AXIOS VERS L'API EXPRESS (http://localhost:3000/api/auth/login)
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData);

    const { token, user } = response.data;

    // 1. Stocker le Token (pour les futures requêtes sécurisées)
    localStorage.setItem('userToken', token);
    
    // 2. Stocker les infos de l'utilisateur (y compris is_owner)
    localStorage.setItem('userData', JSON.stringify(user));

    successMessage.value = response.data.message || 'Connexion réussie !';
    
    // 3. Rediriger vers la page Dashboard (qui gérera la logique is_owner)
    setTimeout(() => {
      router.push('/dashboard'); 
    }, 500);

  } catch (error) {
    if (error.response) {
      // Erreur API (401 Identifiants invalides, 400 Champs manquants)
      errorMessage.value = error.response.data.message || 'Erreur lors de la connexion.';
    } else {
      // Erreur réseau ou serveur non disponible
      errorMessage.value = 'Erreur réseau. Impossible de contacter le serveur.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="form-container">
    <h2>Connexion</h2>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

    <form @submit.prevent="submitLogin">
      <div class="form-group">
        <label for="login-email">Email :</label>
        <input type="email" id="login-email" v-model="email" required>
      </div>

      <div class="form-group">
        <label for="login-password">Mot de passe :</label>
        <input type="password" id="login-password" v-model="password" required>
      </div>

      <button type="submit" class="submit-button" :disabled="isLoading">
        {{ isLoading ? 'Connexion en cours...' : "Se connecter" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
/* Les styles sont similaires à RegisterForm */
.form-container {
  max-width: 400px;
  margin: 30px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}
.form-group { margin-bottom: 15px; text-align: left; }
label { display: block; margin-bottom: 5px; font-weight: bold; }
input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.submit-button {
  background-color: #35495e; /* Couleur sombre Vue */
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  width: 100%;
}
.error-message { color: crimson; font-weight: bold; }
.success-message { color: green; font-weight: bold; }
</style>