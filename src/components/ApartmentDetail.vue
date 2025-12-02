<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

// IMPORTANT : Le router passe le paramètre 'id' comme prop
const props = defineProps({
  id: {
    type: [String, Number],
    required: true
  }
});

const apartment = ref(null);
const loading = ref(true);
const errorMessage = ref('');
const userId = ref(null);

// Variables pour l'Historique
const historyMessages = ref([]);
const loadingHistory = ref(true);

// ------------------------------------
// Fonctions de Récupération de Données
// ------------------------------------

const fetchApartmentDetails = async () => {
  loading.value = true;
  errorMessage.value = '';
  
  const userDataString = localStorage.getItem('userData');
  if (userDataString) {
      userId.value = JSON.parse(userDataString).id;
  }

  try {
    const response = await axios.get(`http://localhost:3000/api/apartments/${props.id}`);
    apartment.value = response.data.apartment;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Erreur lors du chargement des détails de l\'appartement.';
  } finally {
    loading.value = false;
  }
};

const fetchHistory = async () => {
    loadingHistory.value = true;
    try {
        const response = await axios.get(`http://localhost:3000/api/apartments/${props.id}/history`);
        historyMessages.value = response.data.history;
    } catch (error) {
        console.error("Erreur lors du chargement de l'historique:", error);
    } finally {
        loadingHistory.value = false;
    }
};

// ------------------------------------
// Fonction de Mise à Jour (Check)
// ------------------------------------

const toggleAndLogCheckStatus = async () => {
    if (!apartment.value || !userId.value) return;

    // Utilisation de !! pour lire l'état actuel de manière fiable
    const currentStatus = !!apartment.value.to_check;
    const newStatus = currentStatus ? 0 : 1; // 0 ou 1 pour la BDD
    
    let message = '';
    if (newStatus === 1) {
        message = "L'appartement a été marqué **À VÉRIFIER** (to_check: OUI).";
    } else {
        message = "L'appartement a été marqué **VÉRIFIÉ** (to_check: NON).";
    }

    try {
        await axios.put(
            `http://localhost:3000/api/apartments/log-check/${apartment.value.id}`,
            { 
                newStatus: newStatus,
                message: message,
                sender_id: userId.value
            }
        );

        // Mise à jour de l'état local : on stocke 0 ou 1, mais le template sait gérer
        apartment.value.to_check = newStatus;
        alert(`Statut mis à jour et historique enregistré.`);

        await fetchHistory(); 

    } catch (error) {
        alert("Erreur lors de la mise à jour : " + (error.response?.data?.message || "Erreur réseau."));
        console.error("Erreur de bascule et log:", error);
    }
};


onMounted(() => {
  fetchApartmentDetails();
  fetchHistory();
});
</script>

<template>
  <div class="detail-container">
    <router-link to="/dashboard" class="back-link">← Retour au Dashboard</router-link>
    
    <div v-if="loading || loadingHistory" class="loading-state">
      Chargement des détails...
    </div>
    
    <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    
    <div v-else-if="apartment" class="apartment-details">
      <h1>{{ apartment.address }}</h1>
      <p class="city-info">{{ apartment.city }}</p>

      <div class="check-actions">
          <div class="status">
              <strong>Statut VÉRIF. actuel :</strong>
              <span :class="{'status-yes': !!apartment.to_check, 'status-no': !apartment.to_check}">
                  {{ !!apartment.to_check ? 'OUI (À vérifier)' : 'NON (Vérifié)' }}
              </span>
          </div>
          
          <button 
              @click="toggleAndLogCheckStatus" 
              :class="{'check-button-close': !!apartment.to_check, 'check-button-open': !apartment.to_check}"
          >
              {{ !!apartment.to_check ? 'Marquer comme VÉRIFIÉ (Fermer)' : 'Marquer À VÉRIFIER (Ouvrir)' }}
          </button>
      </div>

      <hr>

      <div class="info-grid">
        <div class="card-item inventory">
          <strong>Inventaire :</strong>
          <pre>{{ JSON.stringify(apartment.inventory, null, 2) }}</pre>
        </div>
        
        <div class="card-item">
          <strong>Créé le:</strong>
          {{ new Date(apartment.created_at).toLocaleDateString() }}
        </div>
      </div>
      
      <div class="history-section">
          <h2>Historique des Messages et Événements</h2>
          
          <div v-if="historyMessages.length === 0">
              <p>Aucun historique trouvé pour cet appartement.</p>
          </div>
          <ul v-else class="history-list">
              <li v-for="msg in historyMessages" :key="msg.id" class="history-item">
                  <div class="message-content">
                      {{ msg.message_content }}
                  </div>
                  <div class="message-meta">
                      par <strong>{{ msg.sender_username || 'Système/Inconnu' }}</strong>, 
                      le {{ new Date(msg.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}
                  </div>
              </li>
          </ul>
      </div>

    </div>
    
    <div v-else class="error-message">
      Appartement introuvable.
    </div>
  </div>
</template>

<style scoped>
.detail-container {
  max-width: 800px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 10px;
}
.back-link {
    display: block;
    margin-bottom: 20px;
    text-decoration: none;
    color: #35495e;
}
h1 {
  color: #42b883;
  margin-bottom: 5px;
}
.city-info {
  font-size: 1.2em;
  color: #666;
  margin-bottom: 30px;
}
/* Styles du statut et du bouton */
.check-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #f0f8ff;
    border-radius: 8px;
    margin-bottom: 25px;
    border: 1px solid #cceeff;
}
.status strong { margin-right: 10px; }
.status-yes { color: orange; font-weight: bold; }
.status-no { color: green; font-weight: bold; }

.check-button-open {
    background-color: orange;
}
.check-button-close {
    background-color: green;
}
.check-button-open, .check-button-close {
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
}

hr { border: 0; border-top: 1px solid #eee; margin: 30px 0; }
/* Styles d'information */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.card-item {
  background: #f4f4f4;
  padding: 15px;
  border-radius: 5px;
}
.card-item strong {
    display: block;
    margin-bottom: 5px;
    color: #35495e;
}
.inventory pre {
    white-space: pre-wrap;
    background: #e9e9e9;
    padding: 10px;
    border-radius: 3px;
    font-size: 0.9em;
}
/* Styles de l'historique */
.history-section {
    margin-top: 40px;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
}
.history-list {
    list-style: none;
    padding: 0;
}
.history-item {
    border-bottom: 1px dashed #ccc;
    padding: 10px 0;
    text-align: left;
}
.history-item:last-child {
    border-bottom: none;
}
.message-content {
    font-size: 1.1em;
    margin-bottom: 5px;
}
.message-meta {
    font-size: 0.8em;
    color: #888;
}
.error-message { color: crimson; font-weight: bold; text-align: center; }
</style>