<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// État de connexion global
const isAuthenticated = ref(false);

// Fonction pour vérifier l'état de connexion en regardant le localStorage
const checkAuthStatus = () => {
  // L'utilisateur est connecté si 'userToken' existe.
  isAuthenticated.value = !!localStorage.getItem('userToken');
};

// --- Logique de mise à jour de l'état ---

// 1. Vérification initiale au chargement du composant
onMounted(() => {
  checkAuthStatus();
  
  // Écoute des événements de stockage pour mettre à jour l'état si
  // une déconnexion se produit dans un autre onglet (utile mais optionnel).
  window.addEventListener('storage', checkAuthStatus);
});

// 2. Vérification après chaque navigation (push/replace route)
const route = useRoute();
watch(
    () => route.path,
    () => {
        checkAuthStatus();
    }
);
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <router-link to="/" class="nav-brand">FixMate</router-link>
        
        <template v-if="!isAuthenticated">
          <router-link to="/login" class="nav-link">Connexion</router-link>
          <router-link to="/register" class="nav-link">Inscription</router-link>
        </template>
        
        <template v-else>
          <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
        </template>
      </nav>
    </div>
  </header>
  
  <router-view />
</template>

<style scoped>
header {
  line-height: 1.5;
  background-color: #f8f8f8;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
}
.wrapper {
  max-width: 900px;
  margin: 0 auto;
}
nav {
  width: 100%;
  font-size: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 15px;
}
nav .nav-brand {
    font-weight: bold;
    font-size: 1.2em;
    color: #35495e;
    margin-right: auto; /* Pousse les autres liens à droite */
}
nav a {
  padding: 0 10px;
  text-decoration: none;
  color: #35495e;
}
nav a.router-link-active {
  color: #42b883; /* Couleur verte de Vue */
}
</style>