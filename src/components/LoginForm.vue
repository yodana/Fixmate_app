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
  // 1. Réinitialisation des états
  errorMessage.value = '';
  successMessage.value = '';
  
  // Validation simple
  if (!email.value || !password.value) {
    errorMessage.value = 'Please fill in all fields.';
    return;
  }

  // Création de l'objet de données à envoyer à l'API
  const loginData = {
    email: email.value,
    password: password.value,
  };

  // 2. Appel à l'API
  isLoading.value = true;

  try {
    // ----------------------------------------------------
    // APPEL AXIOS VERS L'API EXPRESS (http://localhost:3000/api/auth/login)
    // ----------------------------------------------------
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData);

    const { token, user } = response.data;

    // 1. Stocker le Token (pour les futures requêtes sécurisées)
    localStorage.setItem('userToken', token);

    // 2. Stocker les infos de l'utilisateur (y compris is_owner)
    localStorage.setItem('userData', JSON.stringify(user));

    successMessage.value = response.data.message || 'Login successful !';

    // 3. Rediriger vers la page Dashboard (qui gérera la logique is_owner)
    setTimeout(() => {
      router.push('/dashboard'); 
    }, 500);

  } catch (error) {
    // 4. Gestion des erreurs de l'API
    if (error.response) {
      // Erreur API (401 Identifiants invalides, 400 Champs manquants)
      errorMessage.value = error.response.data.message || 'Error during login.';
    } else {
      // Erreur réseau ou serveur non disponible
      errorMessage.value = 'Network error. Unable to contact the server.';
    }
  } finally {
    // 5. Arrêter l'état de chargement
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="form-container">
      <div class="header">
        <h2>Login</h2>
        <p class="subtitle">Login to your account</p>
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

      <form @submit.prevent="submitLogin">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" v-model="email" required placeholder="exemple@email.com">
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" v-model="password" required placeholder="Your password">
        </div>

        <button type="submit" class="submit-button" :disabled="isLoading">
          <span v-if="!isLoading">Login</span>
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
            Login in progress
          </span>
        </button>

        <div class="register-link">
          No account ? <router-link to="/register">Register</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.login-page {
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
  max-width: 460px;
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

/* Register Link */
.register-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #718096;
}

.register-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.register-link a:hover {
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

  .header h2 {
    font-size: 24px;
  }
}
</style>