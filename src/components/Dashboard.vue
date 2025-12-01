<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios'; // Pour les appels à l'API

const userName = ref('');
const userId = ref(null); // Pour identifier l'utilisateur
const isOwner = ref(false);
const apartments = ref([]); 
const router = useRouter(); 
const loadingApartments = ref(false);
const allOwners = ref([]); 
const linkedApartments = ref([]); 
const loadingOwners = ref(false);
const loadingLinkedApts = ref(false);
// Fonction pour récupérer la liste des appartements de l'utilisateur
const fetchApartments = async (id) => {
    loadingApartments.value = true;
    try {
        // Dans une application réelle, cette route devrait être sécurisée et filtrer
        // les appartements par l'ID de l'utilisateur connecté ou par apartment_id.
        
        // Simulation d'une route API pour récupérer les appartements
        const response = await axios.get(`http://localhost:3000/api/apartments/user/${id}`);
        apartments.value = response.data.apartments;

    } catch (error) {
        console.error("Erreur lors du chargement des appartements:", error);
        apartments.value = [];
    } finally {
        loadingApartments.value = false;
    }
};

// Fonction pour basculer le statut 'to_check' via l'API
const toggleCheckStatus = async (apartmentId, currentStatus, index) => {
    // Déterminer le nouveau statut (inverser 0 devient 1, 1 devient 0)
    const newStatus = currentStatus === 0 || currentStatus === false ? 1 : 0;
    
    try {
        const response = await axios.put(
            `http://localhost:3000/api/apartments/toggle-check/${apartmentId}`, 
            { newStatus }
        );

        if (response.data.success) {
            // Mise à jour de l'état local immédiatement après le succès de l'API
            apartments.value[index].to_check = newStatus;
            console.log(response.data.message);
        }
        
    } catch (error) {
        alert("Erreur lors de la mise à jour : " + (error.response?.data?.message || "Erreur réseau."));
        console.error("Erreur de bascule :", error);
    }
};

// Fonction pour récupérer la liste de TOUS les propriétaires
const fetchOwners = async () => {
    loadingOwners.value = true;
    try {
        const response = await axios.get('http://localhost:3000/api/users/owners');
        // Filtre l'utilisateur lui-même (au cas où il est propriétaire et listé)
        allOwners.value = response.data.owners.filter(owner => owner.id !== userId.value); 
    } catch (error) {
        console.error("Erreur lors du chargement des propriétaires:", error);
    } finally {
        loadingOwners.value = false;
    }
};

// Fonction pour lier le locataire au propriétaire (appelle la route POST)
const linkOwner = async (ownerId, ownerUsername) => {
    try {
        const response = await axios.post('http://localhost:3000/api/users/link-owner', {
            user_id: userId.value, // Le locataire actuel
            owner_id: ownerId      // Le propriétaire sélectionné
        });
        
        alert(`Liaison établie avec ${ownerUsername} !`);
        
        // Rafraîchir la liste des appartements à vérifier
        await fetchApartmentsToCheck(); 

    } catch (error) {
        alert("Erreur lors de la liaison: " + (error.response?.data?.message || "Erreur réseau."));
    }
};

// Fonction pour récupérer les appartements à vérifier des propriétaires liés
const fetchApartmentsToCheck = async () => {
    if (!userId.value) return;
    loadingLinkedApts.value = true;

    try {
        // Appelle la route qui effectue la jointure sur user_relations
        const response = await axios.get(`http://localhost:3000/api/apartments/to-check-by-user/${userId.value}`);
        linkedApartments.value = response.data.apartments;
    } catch (error) {
        console.error("Erreur lors du chargement des appartements à vérifier:", error);
    } finally {
        loadingLinkedApts.value = false;
    }
};

// ... (Fonction logout inchangée) ...
const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    router.push('/login');
};

onMounted(() => {
    const userDataString = localStorage.getItem('userData');
    
    if (userDataString) {
        const userData = JSON.parse(userDataString);
        userName.value = userData.username;
        isOwner.value = userData.is_owner; 
        userId.value = userData.id; // Stocker l'ID de l'utilisateur
        
        if (userData.is_owner) {
            // Charger les appartements en passant l'ID de l'utilisateur
            fetchApartments(userData.id); 
        }
        else {
            // Vue Locataire
            fetchOwners();
            fetchApartmentsToCheck();
        }
    } else {
        router.push('/login'); 
    }
});
</script>

<template>
  <div class="dashboard-container">
    <h1>Bienvenue, {{ userName }} !</h1>
    
    <div v-if="isOwner" class="owner-view">
      <h2>Vos Biens Immobiliers</h2>

      <router-link to="/add-apartment" class="add-button">
        Ajouter un appartement
      </router-link>

      <div v-if="loadingApartments">Chargement de vos biens...</div>
      <div v-else-if="apartments.length > 0" class="apartment-grid">
        <div v-for="(apt, index) in apartments" :key="apt.id" class="apartment-card">
            <div class="card-info">
                <h3>{{ apt.address }}</h3>
                <p>{{ apt.city }}, {{ apt.postcode }}</p>
                <p class="status-check">
                    Statut VÉRIF. : 
                    <span :class="{'checked': apt.to_check, 'unchecked': !apt.to_check}">
                        {{ apt.to_check ? 'OUI' : 'NON' }}
                    </span>
                </p>
            </div>
            
            <button 
                @click="toggleCheckStatus(apt.id, apt.to_check, index)" 
                class="toggle-button"
            >
                Basculer Vérification ({{ apt.to_check ? 'Fermer' : 'Ouvrir' }})
            </button>
        </div>
      </div>
      <div v-else>
        <p>Vous n'avez pas encore enregistré d'appartement.</p>
      </div>

    </div>

    <div v-else class="tenant-view">
<h2>Espace Locataire</h2>
        <div class="section">
            <h3>Appartements à Vérifier (to_check: OUI)</h3>
            <div v-if="loadingLinkedApts">Chargement des biens à vérifier...</div>
            <div v-else-if="linkedApartments.length > 0" class="apartment-grid">
                <div v-for="apt in linkedApartments" :key="apt.id" class="apartment-card check-card">
                    <div class="card-info">
                        <h3>{{ apt.address }}</h3>
                        <p>Ville : {{ apt.city }}</p>
                        <p>Propriétaire : <strong>{{ apt.owner_username }}</strong></p>
                    </div>
                    
                    <button class="send-photo-button" disabled>
                        Envoyer des photos 📷 (Non Fonctionnel)
                    </button>
                </div>
            </div>
            <div v-else>
                <p>Aucun appartement n'est actuellement marqué pour vérification par vos propriétaires liés.</p>
            </div>
        </div>
        
        <hr>

        <div class="section">
            <h3>Lier à un Propriétaire</h3>
            <div v-if="loadingOwners">Chargement des propriétaires...</div>
            <div v-else-if="allOwners.length > 0" class="owners-list">
                <div v-for="owner in allOwners" :key="owner.id" class="owner-item">
                    <span>{{ owner.username }}</span>
                    <button @click="linkOwner(owner.id, owner.username)" class="link-button">
                        Ajouter
                    </button>
                </div>
            </div>
            <div v-else>
                <p>Aucun propriétaire trouvé dans la base de données.</p>
            </div>
        </div>
      </div>
    
    <button @click="logout" class="logout-button">Déconnexion</button>
  </div>
</template>

<style scoped>
/* Styles spécifiques pour le Dashboard */
.dashboard-container { max-width: 900px; margin: 50px auto; padding: 30px; border: 1px solid #ddd; border-radius: 10px; text-align: center; }
h1 { color: #35495e; }
.add-button { background-color: #42b883; color: white; padding: 10px 20px; margin-bottom: 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
.logout-button { background-color: crimson; color: white; padding: 10px 15px; border: none; border-radius: 5px; margin-top: 30px; cursor: pointer; }

/* Styles de la grille et des cartes */
.apartment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}
.apartment-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.card-info h3 {
    margin-top: 0;
    color: #35495e;
}
.status-check {
    font-weight: bold;
    margin-top: 10px;
    font-size: 0.9em;
}
.checked {
    color: orange; /* Couleur pour marquer comme nécessitant une vérification */
}
.unchecked {
    color: green;
}
.toggle-button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
}
</style>