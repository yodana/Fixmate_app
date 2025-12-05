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
      <div class="detail-page">
        <div class="detail-container">
          <router-link to="/dashboard" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Retour au Dashboard
          </router-link>
          
          <div v-if="loading || loadingHistory" class="loading-state">
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
            <p>Chargement des détails...</p>
          </div>
          
          <div v-else-if="errorMessage" class="error-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>{{ errorMessage }}</p>
          </div>
          
          <div v-else-if="apartment" class="apartment-details">
            <div class="header-section">
              <div class="apartment-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="header-info">
                <h1>{{ apartment.address }}</h1>
                <p class="city-info">{{ apartment.city }}</p>
              </div>
            </div>

            <div class="status-card">
              <div class="status-header">
                <div class="status-info">
                  <h3>Statut de Vérification</h3>
                  <div class="status-badge" :class="!!apartment.to_check ? 'status-pending' : 'status-verified'">
                    <svg v-if="!!apartment.to_check" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    {{ !!apartment.to_check ? 'À VÉRIFIER' : 'VÉRIFIÉ' }}
                  </div>
                </div>
                <button 
                  @click="toggleAndLogCheckStatus" 
                  class="toggle-button"
                  :class="!!apartment.to_check ? 'button-verify' : 'button-pending'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {{ !!apartment.to_check ? 'Marquer comme VÉRIFIÉ' : 'Marquer À VÉRIFIER' }}
                </button>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-card">
                <div class="card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <h3>Inventaire</h3>
                </div>
                <div class="inventory-content">
                  <pre>{{ JSON.stringify(apartment.inventory, null, 2) }}</pre>
                </div>
              </div>
              
              <div class="info-card">
                <div class="card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <h3>Date de Création</h3>
                </div>
                <div class="date-content">
                  {{ new Date(apartment.created_at).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) }}
                </div>
              </div>
            </div>
            
            <div class="history-section">
              <div class="history-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <h2>Historique des Messages et Événements</h2>
              </div>
              
              <div v-if="historyMessages.length === 0" class="empty-history">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>Aucun historique trouvé pour cet appartement.</p>
              </div>
              
              <div v-else class="history-timeline">
                <div v-for="msg in historyMessages" :key="msg.id" class="history-item">
                  <div class="timeline-dot"></div>
                  <div class="history-card">
                    <div class="message-content">
                      {{ msg.message_content }}
                    </div>
                    <div class="message-meta">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span class="username">{{ msg.sender_username || 'Système/Inconnu' }}</span>
                      <span class="separator">•</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span class="date">{{ new Date(msg.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div v-else class="error-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p>Appartement introuvable.</p>
          </div>
        </div>
      </div>
    </template>

    <style scoped>
    * {
      box-sizing: border-box;
    }

    .detail-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .detail-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 30px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.95);
      color: #667eea;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .back-link:hover {
      background: white;
      transform: translateX(-4px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    /* Loading State */
    .loading-state {
      background: white;
      border-radius: 20px;
      padding: 60px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .loading-state .spinner {
      color: #667eea;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    .loading-state p {
      color: #718096;
      font-size: 16px;
      margin: 0;
    }

    /* Error Card */
    .error-card {
      background: white;
      border-radius: 20px;
      padding: 60px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .error-card svg {
      color: #fc8181;
      margin-bottom: 20px;
    }

    .error-card p {
      color: #c53030;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    /* Apartment Details */
    .apartment-details {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .header-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 2px solid #e2e8f0;
    }

    .apartment-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .apartment-icon svg {
      color: #667eea;
    }

    .header-info h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      color: #1a202c;
      font-weight: 700;
    }

    .city-info {
      margin: 0;
      font-size: 18px;
      color: #718096;
    }

    /* Status Card */
    .status-card {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .status-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .status-info h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #2d3748;
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    .status-pending {
      background: #fef3cd;
      color: #d97706;
      border: 1px solid #fbbf24;
    }

    .status-verified {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #34d399;
    }

    .toggle-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .button-verify {
      background: #10b981;
      color: white;
    }

    .button-verify:hover {
      background: #059669;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .button-pending {
      background: #f59e0b;
      color: white;
    }

    .button-pending:hover {
      background: #d97706;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 40px;
    }

    .info-card {
      background: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      transition: all 0.3s ease;
    }

    .info-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .card-header svg {
      color: #667eea;
    }

    .card-header h3 {
      margin: 0;
      font-size: 18px;
      color: #2d3748;
      font-weight: 600;
    }

    .inventory-content pre {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      color: #2d3748;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .date-content {
      font-size: 16px;
      color: #4a5568;
      font-weight: 500;
    }

    /* History Section */
    .history-section {
      background: #f7fafc;
      border-radius: 16px;
      padding: 32px;
    }

    .history-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .history-header svg {
      color: #667eea;
    }

    .history-header h2 {
      margin: 0;
      font-size: 24px;
      color: #1a202c;
      font-weight: 700;
    }

    .empty-history {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-history svg {
      color: #cbd5e0;
      margin-bottom: 16px;
    }

    .empty-history p {
      color: #718096;
      font-size: 16px;
      margin: 0;
    }

    /* Timeline */
    .history-timeline {
      position: relative;
      padding-left: 40px;
    }

    .history-timeline::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 12px;
      bottom: 12px;
      width: 2px;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
    }

    .history-item {
      position: relative;
      margin-bottom: 24px;
    }

    .history-item:last-child {
      margin-bottom: 0;
    }

    .timeline-dot {
      position: absolute;
      left: -34px;
      top: 12px;
      width: 12px;
      height: 12px;
      background: white;
      border: 3px solid #667eea;
      border-radius: 50%;
      z-index: 1;
    }

    .history-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }

    .history-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
      transform: translateX(4px);
    }

    .message-content {
      font-size: 15px;
      color: #2d3748;
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #718096;
    }

    .message-meta svg {
      color: #a0aec0;
    }

    .username {
      font-weight: 600;
      color: #4a5568;
    }

    .separator {
      color: #cbd5e0;
    }

    /* Animations */
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .detail-page {
        padding: 20px 16px;
      }

      .apartment-details {
        padding: 24px;
      }

      .header-section {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-info h1 {
        font-size: 24px;
      }

      .status-header {
        flex-direction: column;
        align-items: stretch;
      }

      .toggle-button {
        width: 100%;
        justify-content: center;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .history-timeline {
        padding-left: 32px;
      }

      .history-section {
        padding: 24px 20px;
      }
    }
    </style>