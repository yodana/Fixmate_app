<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import PhotoUpload from './PhotoUpload.vue'; // chemin vers ton composant

const router = useRouter();

const userName = ref('');
const userId = ref(null);
const isOwner = ref(false);
const apartments = ref([]);
const linkedApartments = ref([]);
const allOwners = ref([]);
const loadingApartments = ref(false);
const loadingLinkedApts = ref(false);
const loadingOwners = ref(false);

// PhotoUpload modal
const showPhotoUploadModal = ref(false);
const selectedApartmentId = ref(null);

const openPhotoUpload = (apartmentId) => {
  selectedApartmentId.value = apartmentId;
  showPhotoUploadModal.value = true;
};

const closePhotoUpload = () => {
  showPhotoUploadModal.value = false;
};

// --- Fonctions API ---
const fetchApartments = async (id) => {
  loadingApartments.value = true;
  try {
    const res = await axios.get(`http://localhost:3000/api/apartments/user/${id}`);
    apartments.value = res.data.apartments;
  } catch (err) {
    console.error(err);
    apartments.value = [];
  } finally {
    loadingApartments.value = false;
  }
};

const fetchOwners = async () => {
  loadingOwners.value = true;
  try {
    const res = await axios.get('http://localhost:3000/api/users/owners');
    allOwners.value = res.data.owners.filter(o => o.id !== userId.value);
  } catch (err) {
    console.error(err);
  } finally {
    loadingOwners.value = false;
  }
};

const linkOwner = async (ownerId, ownerUsername) => {
  try {
    await axios.post('http://localhost:3000/api/users/link-owner', {
      user_id: userId.value,
      owner_id: ownerId
    });
    alert(`Link established with ${ownerUsername}!`);
    await fetchApartmentsToCheck();
  } catch (err) {
    alert("Error linking: " + (err.response?.data?.message || "Network error."));
  }
};

const fetchApartmentsToCheck = async () => {
  if (!userId.value) return;
  loadingLinkedApts.value = true;
  try {
    const res = await axios.get(`http://localhost:3000/api/apartments/to-check-by-user/${userId.value}`);
    linkedApartments.value = res.data.apartments;
  } catch (err) {
    console.error(err);
  } finally {
    loadingLinkedApts.value = false;
  }
};

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
    userId.value = userData.id;

    if (userData.is_owner) {
      fetchApartments(userData.id);
    } else {
      fetchOwners();
      fetchApartmentsToCheck();
    }
  } else {
    router.push('/login');
  }
});
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="welcome-section">
          <div class="avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="welcome-text">
            <h1>Welcome, {{ userName }}!</h1>
            <p class="role-badge" :class="isOwner ? 'role-owner' : 'role-cleaner'">
              {{ isOwner ? 'Property Manager' : 'Cleaner' }}
            </p>
          </div>
        </div>
        <button @click="logout" class="logout-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log Out
        </button>
      </div>

      <!-- Owner View -->
      <div v-if="isOwner" class="owner-view">
        <div class="section-header">
          <h2>Your Real Estate Properties</h2>
          <router-link to="/add-apartment" class="add-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add an apartment
          </router-link>
        </div>

        <div v-if="loadingApartments" class="loading-state">
          <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <p>Loading your properties...</p>
        </div>

        <div v-else-if="apartments.length > 0" class="apartment-grid">
          <router-link 
            v-for="apt in apartments" 
            :key="apt.id"
            :to="{ name: 'apartment-detail', params: { id: apt.id } }" 
            class="apartment-card-link"
          >
            <div class="apartment-card">
              <div class="card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="card-content">
                <h3>{{ apt.address }}</h3>
                <p class="city">{{ apt.city }}</p>
                <div class="status-badge" :class="apt.to_check ? 'status-pending' : 'status-verified'">
                  <svg v-if="apt.to_check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  {{ apt.to_check ? 'À VÉRIFIER' : 'VÉRIFIÉ' }}
                </div>
              </div>
              <div class="card-actions">
                <button @click.prevent="openPhotoUpload(apt.id)" class="photo-btn" title="Gérer les photos">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </button>
                <div class="card-arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </router-link>
        </div>

        <div v-else class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <h3>No apartments registered</h3>
          <p>Start by adding your first property</p>
          <router-link to="/add-apartment" class="empty-action-button">
            Add an apartment
          </router-link>
        </div>
      </div>

      <!-- Tenant View -->
      <div v-else class="tenant-view">
        <!-- Apartments to Check Section -->
        <div class="section">
          <div class="section-header">
            <h2>Apartment to Verify</h2>
          </div>

          <div v-if="loadingLinkedApts" class="loading-state">
            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <p>Loading apartments to verify...</p>
          </div>

          <div v-else-if="linkedApartments.length > 0" class="apartment-grid">
            <div v-for="apt in linkedApartments" :key="apt.id" class="check-apartment-card">
              <div class="card-header-flex">
                <div class="card-icon check-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <div class="card-content">
                  <h3>{{ apt.address }}</h3>
                  <p class="city">{{ apt.city }}</p>
                  <p class="owner-info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    {{ apt.owner_username }}
                  </p>
                </div>
              </div>
              <button class="send-photo-button" @click="openPhotoUpload(apt.id)">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Send Photos
              </button>
            </div>
          </div>

          <div v-else class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h3>No apartments to verify</h3>
            <p>No property is currently marked for verification</p>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Link to Owner Section -->
        <div class="section">
          <div class="section-header">
            <h2>Link to Owner</h2>
          </div>

          <div v-if="loadingOwners" class="loading-state">
            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <p>Loading owners...</p>
          </div>

          <div v-else-if="allOwners.length > 0" class="owners-grid">
            <div v-for="owner in allOwners" :key="owner.id" class="owner-card">
              <div class="owner-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span class="owner-name">{{ owner.username }}</span>
              <button @click="linkOwner(owner.id, owner.username)" class="link-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Associate with this owner
              </button>
            </div>
          </div>

          <div v-else class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="22" y1="21" x2="16" y2="15"></line>
              <line x1="16" y1="21" x2="22" y2="15"></line>
            </svg>
            <h3>No owners available</h3>
            <p>No owners found in the database</p>
          </div>
        </div>
      </div>
    </div>

    <!-- PhotoUpload Modal -->
    <div v-if="showPhotoUploadModal" class="modal-overlay" @click.self="closePhotoUpload">
      <div class="modal-content">
        <button class="close-btn" @click="closePhotoUpload">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <PhotoUpload
          :apartment-id="selectedApartmentId"
          :role="isOwner ? 'owner' : 'cleaner'"
          @photos-uploaded="closePhotoUpload"
          @close="closePhotoUpload"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.dashboard-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.dashboard-container { max-width: 1200px; margin: 0 auto; }

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px 32px;
  border-radius: 20px;
  margin-bottom: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.welcome-section { display: flex; align-items: center; gap: 20px; }

.avatar {
  width: 64px; height: 64px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar svg { color: #667eea; }

.welcome-text h1 { margin: 0 0 8px 0; font-size: 28px; color: #1a202c; font-weight: 700; }

.role-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.role-owner {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.role-cleaner {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-button:hover {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 { margin: 0; font-size: 24px; color: white; font-weight: 700; }

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.add-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); }

.loading-state { background: white; border-radius: 16px; padding: 60px; text-align: center; }

.loading-state .spinner { color: #667eea; animation: spin 1s linear infinite; margin-bottom: 16px; }

.loading-state p { color: #718096; font-size: 16px; margin: 0; }

.apartment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.apartment-card-link { text-decoration: none; display: block; }

.apartment-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.apartment-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15); }

.card-icon {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg { color: #667eea; }

.check-icon { background: rgba(245, 158, 11, 0.1); }
.check-icon svg { color: #f59e0b; }

.card-content { flex: 1; min-width: 0; }

.card-content h3 {
  margin: 0 0 6px 0;
  font-size: 18px;
  color: #1a202c;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.city { margin: 0 0 12px 0; font-size: 14px; color: #718096; }

.owner-info {
  margin: 0;
  font-size: 13px;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 6px;
}

.owner-info svg { color: #a0aec0; }

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending { background: #fef3cd; color: #d97706; border: 1px solid #fbbf24; }
.status-verified { background: #d1fae5; color: #065f46; border: 1px solid #34d399; }

.card-arrow { flex-shrink: 0; color: #cbd5e0; transition: all 0.3s ease; }

.apartment-card:hover .card-arrow { color: #667eea; transform: translateX(4px); }

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.photo-btn {
  width: 40px;
  height: 40px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.photo-btn:hover {
  background: #5a67d8;
  transform: scale(1.1);
}

.check-apartment-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.check-apartment-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15); }

.card-header-flex { display: flex; align-items: center; gap: 16px; }

.send-photo-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-photo-button:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.4);
}

/* Owners Grid */
.owners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.owner-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.owner-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

.owner-avatar {
  width: 48px;
  height: 48px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.owner-avatar svg {
  color: #667eea;
}

.owner-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a202c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.link-button:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* Divider */
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 40px 0;
}

/* Empty States */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-state h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #718096;
}

.empty-action-button {
  margin-top: 16px;
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
}

.empty-action-button:hover {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 32px;
  position: relative;
  width: 90%;
  max-width: 600px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #667eea;
  transition: all 0.3s ease;
}

.close-btn:hover {
  transform: rotate(90deg);
}

/* Spinner Animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>