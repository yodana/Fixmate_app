<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';


// Props
const props = defineProps({
  apartmentId: { type: Number, required: true },
  role: { type: String, required: true, validator: val => ['cleaner', 'manager'].includes(val) }
});

// States
const photos = ref([]);
const selectedFiles = ref([]);
const message = ref('');
const uploading = ref(false);
const loading = ref(false);
const processing = ref(false);
const isDragging = ref(false);
const stats = ref({ pending: 0, approved: 0, rejected: 0 });
const rejectModalVisible = ref(false);
const rejectPhotoId = ref(null);
const rejectFeedback = ref('');
const userId = ref(null);

// Récupérer userId depuis localStorage
onMounted(() => {
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (userData?.id) userId.value = userData.id;
  loadPhotos();
  loadStats();
});

// ---------- Upload ----------
function handleFileSelect(event) {
  addFiles(Array.from(event.target.files));
}
function handleDrop(event) {
  isDragging.value = false;
  addFiles(Array.from(event.dataTransfer.files));
}
function addFiles(files) {
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => selectedFiles.value.push({ file, preview: e.target.result });
      reader.readAsDataURL(file);
    }
  });
}
function removeFile(index) {
  selectedFiles.value.splice(index, 1);
}
async function uploadPhotos() {
  if (!selectedFiles.value.length) return;
  uploading.value = true;
  const formData = new FormData();
  selectedFiles.value.forEach(({ file }) => formData.append('photos', file));
  formData.append('message', message.value);
  formData.append('userId', userId.value);
  try {
    const res = await axios.post(`/api/apartments/${props.apartmentId}/photos`, formData);
    selectedFiles.value = [];
    message.value = '';
    await loadPhotos();
    await loadStats();
    alert(`✅ ${res.data.photos.length} photo(s) uploadée(s) avec succès !`);
  } catch (e) {
    console.error('Upload error:', e);
    alert('❌ Erreur lors de l\'upload des photos');
  } finally {
    uploading.value = false;
  }
}

// ---------- Load ----------
async function loadPhotos() {
  loading.value = true;
  try {
    const res = await axios.get(`/api/apartments/${props.apartmentId}/photos`, {
      params: { role: props.role }
    });
    photos.value = res.data;
  } catch (e) {
    console.error('Load photos error:', e);
    photos.value = [];
  } finally {
    loading.value = false;
  }
}
async function loadStats() {
  try {
    const res = await axios.get(`/api/apartments/${props.apartmentId}/photos/stats`);
    stats.value = res.data;
  } catch (e) {
    console.error('Load stats error:', e);
  }
}

// ---------- Approve / Reject ----------
async function approvePhoto(photoId) {
  if (!confirm('Approuver cette photo ?')) return;
  processing.value = true;
  try {
    const res = await axios.patch(`/api/photos/${photoId}/status`, {
      status: 'approved',
      reviewedBy: userId.value
    });
    await loadPhotos();
    await loadStats();
    alert('✅ Photo approuvée !');
  } catch (e) {
    console.error(e);
    alert('❌ Erreur lors de l\'approbation');
  } finally {
    processing.value = false;
  }
}
function showRejectModal(photoId) {
  rejectPhotoId.value = photoId;
  rejectFeedback.value = '';
  rejectModalVisible.value = true;
}
function closeRejectModal() {
  rejectModalVisible.value = false;
  rejectPhotoId.value = null;
  rejectFeedback.value = '';
}
async function confirmReject() {
  if (!rejectPhotoId.value) return;
  processing.value = true;
  try {
    await axios.patch(`/api/photos/${rejectPhotoId.value}/status`, {
      status: 'rejected',
      feedback: rejectFeedback.value,
      reviewedBy: userId.value
    });
    await loadPhotos();
    await loadStats();
    closeRejectModal();
    alert('✅ Photo rejetée');
  } catch (e) {
    console.error(e);
    alert('❌ Erreur lors du rejet');
  } finally {
    processing.value = false;
  }
}

// ---------- Helpers ----------
function getPhotoUrl(url) {
  return url.startsWith('http') ? url : `http://localhost:3000${url}`;
}
function getStatusLabel(status) {
  return { pending: '⏳ En attente', approved: '✅ Approuvé', rejected: '❌ Rejeté' }[status] || status;
}
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
function openLightbox(photo) {
  window.open(getPhotoUrl(photo.photo_url), '_blank');
}
</script>

<template>
<div class="photo-upload-section">

  <!-- Cleaner Upload Zone -->
  <div v-if="props.role === 'cleaner'" class="upload-zone">
    <h3 class="section-title">📸 Upload de Photos</h3>
    <div class="drop-zone"
         :class="{ 'drag-over': isDragging }"
         @click="$refs.fileInput.click()"
         @dragover.prevent="isDragging = true"
         @dragleave.prevent="isDragging = false"
         @drop.prevent="handleDrop">
      <div class="drop-zone-content">
        <div class="upload-icon">📷</div>
        <p class="upload-text">Cliquez ou glissez vos photos ici</p>
        <p class="upload-hint">Formats acceptés: JPG, PNG, GIF • Max 10MB par photo</p>
      </div>
    </div>
    <input ref="fileInput" type="file" multiple accept="image/*"
           @change="handleFileSelect" style="display:none" />
    <div v-if="selectedFiles.length" class="preview-section">
      <div class="preview-grid">
        <div v-for="(file, index) in selectedFiles" :key="index" class="preview-card">
          <img :src="file.preview" :alt="`Preview ${index + 1}`" />
          <button @click="removeFile(index)" class="remove-btn" title="Supprimer">×</button>
        </div>
      </div>
      <textarea v-model="message" placeholder="Ajouter un message (optionnel)" rows="3" class="message-input"></textarea>
      <button @click="uploadPhotos" :disabled="uploading" class="upload-btn">
        <span v-if="!uploading">⬆️ Envoyer {{ selectedFiles.length }} photo(s)</span>
        <span v-else>Upload en cours...</span>
      </button>
    </div>
  </div>

  <!-- Photos List -->
  <div class="photos-list">
    <div class="list-header">
      <h3 class="section-title">🖼️ Photos {{ props.role === 'manager' ? 'à valider' : 'uploadées' }}</h3>
      <div class="stats-badges">
        <span class="badge badge-pending">{{ stats.pending }} en attente</span>
        <span class="badge badge-approved">{{ stats.approved }} approuvées</span>
        <span class="badge badge-rejected">{{ stats.rejected }} rejetées</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des photos...</p>
    </div>
    <div v-else-if="!photos.length" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>Aucune photo pour le moment</p>
    </div>
    <div v-else class="photos-grid">
      <div v-for="photo in photos" :key="photo.id" class="photo-card">
        <div class="photo-image-wrapper">
          <img :src="getPhotoUrl(photo.photo_url)" :alt="photo.message" class="photo-image"
               @click="openLightbox(photo)" />
          <span class="status-badge" :class="`badge-${photo.status}`">{{ getStatusLabel(photo.status) }}</span>
        </div>
        <div class="photo-info">
          <div class="photo-meta">
            <span class="photo-date">📅 {{ formatDate(photo.uploaded_at) }}</span>
            <span class="photo-uploader">👤 {{ photo.uploaded_by }}</span>
          </div>
          <p v-if="photo.message" class="photo-message">💬 {{ photo.message }}</p>
          <p v-if="photo.feedback" class="photo-feedback">📝 <strong>Feedback:</strong> {{ photo.feedback }}</p>
          <div v-if="props.role === 'manager' && photo.status === 'pending'" class="action-buttons">
            <button @click="approvePhoto(photo.id)" class="btn btn-approve" :disabled="processing">✓ Approuver</button>
            <button @click="showRejectModal(photo.id)" class="btn btn-reject" :disabled="processing">✗ Rejeter</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Reject Modal -->
  <div v-if="rejectModalVisible" class="modal-overlay" @click="closeRejectModal">
    <div class="modal-content" @click.stop>
      <h3 class="modal-title">Rejeter cette photo</h3>
      <textarea v-model="rejectFeedback" placeholder="Raison du rejet (optionnel)" class="modal-textarea" rows="4"></textarea>
      <div class="modal-actions">
        <button @click="closeRejectModal" class="btn btn-secondary">Annuler</button>
        <button @click="confirmReject" class="btn btn-reject">Confirmer le rejet</button>
      </div>
    </div>
  </div>

</div>
</template>




    <style scoped>
    /* ========== VARIABLES ========== */
    :root {
    --primary-color: #3b82f6;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-600: #4b5563;
    --gray-800: #1f2937;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ========== LAYOUT ========== */
    .photo-upload-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    }

    .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-800);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    }

    .icon {
    font-size: 1.75rem;
    }

    /* ========== UPLOAD ZONE ========== */
    .upload-zone {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow-md);
    }

    .drop-zone {
    border: 3px dashed var(--gray-300);
    border-radius: 1rem;
    padding: 3rem;
    text-align: center;
    cursor: pointer;
    transition: var(--transition);
    background: var(--gray-50);
    }

    .drop-zone:hover,
    .drop-zone.drag-over {
    border-color: var(--primary-color);
    background: rgba(59, 130, 246, 0.05);
    transform: scale(1.01);
    }

    .upload-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: bounce 2s infinite;
    }

    @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    }

    .upload-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-800);
    margin-bottom: 0.5rem;
    }

    .upload-hint {
    font-size: 0.875rem;
    color: var(--gray-600);
    }

    /* ========== PREVIEW ========== */
    .preview-section {
    margin-top: 2rem;
    }

    .preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
    }

    .preview-card {
    position: relative;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
    }

    .preview-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    }

    .preview-card img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    }

    .remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 32px;
    height: 32px;
    background: var(--danger-color);
    color: white;
    border: 3px solid white;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    box-shadow: var(--shadow-md);
    }

    .remove-btn:hover {
    background: #dc2626;
    transform: rotate(90deg);
    }

    .message-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--gray-300);
    border-radius: 0.75rem;
    font-size: 0.875rem;
    resize: vertical;
    transition: var(--transition);
    font-family: inherit;
    }

    .message-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .upload-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary-color), #2563eb);
    color: white;
    border: none;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    margin-top: 1rem;
    box-shadow: var(--shadow-md);
    }

    .upload-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    }

    .upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    }

    /* ========== PHOTOS LIST ========== */
    .photos-list {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: var(--shadow-md);
    }

    .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
    }

    .stats-badges {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    }

    .badge {
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 600;
    }

    .badge-pending {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning-color);
    }

    .badge-approved {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
    }

    .badge-rejected {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger-color);
    }

    /* ========== PHOTOS GRID ========== */
    .photos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    }

    .photo-card {
    border-radius: 1rem;
    overflow: hidden;
    background: var(--gray-50);
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
    }

    .photo-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    }

    .photo-image-wrapper {
    position: relative;
    height: 200px;
    overflow: hidden;
    }

    .photo-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
    transition: var(--transition);
    }

    .photo-image:hover {
    transform: scale(1.05);
    }

    .status-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    font-weight: 600;
    backdrop-filter: blur(8px);
    }

    .status-badge.badge-pending {
    background: rgba(245, 158, 11, 0.9);
    color: white;
    }

    .status-badge.badge-approved {
    background: rgba(16, 185, 129, 0.9);
    color: white;
    }

    .status-badge.badge-rejected {
    background: rgba(239, 68, 68, 0.9);
    color: white;
    }

    .photo-info {
    padding: 1.25rem;
    }

    .photo-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--gray-600);
    margin-bottom: 0.75rem;
    }

    .photo-message,
    .photo-feedback {
    font-size: 0.875rem;
    color: var(--gray-800);
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: white;
    border-radius: 0.5rem;
    }

    .photo-feedback {
    background: rgba(239, 68, 68, 0.05);
    border-left: 3px solid var(--danger-color);
    }

    /* ========== ACTION BUTTONS ========== */
    .action-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
    }

    .btn {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    font-size: 0.875rem;
    }

    .btn-approve {
    background: var(--success-color);
    color: white;
    }

    .btn-approve:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-2px);
    }

    .btn-reject {
    background: var(--danger-color);
    color: white;
    }

    .btn-reject:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-2px);
    }

    .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    }

    /* ========== MODAL ========== */
    .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s;
    }

    @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
    }

    .modal-content {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.3s;
    }

    @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
    }

    .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    }

    .modal-textarea {
    width: 100%;
    padding: 1rem;
    border: 2px solid var(--gray-300);
    border-radius: 0.75rem;
    resize: vertical;
    font-family: inherit;
    margin-bottom: 1rem;
    }

    .modal-textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    }

    .modal-actions {
    display: flex;
    gap: 1rem;
    }

    .btn-secondary {
    flex: 1;
    background: var(--gray-200);
    color: var(--gray-800);
    }

    .btn-secondary:hover {
    background: var(--gray-300);
    }

    /* ========== LOADING & EMPTY STATES ========== */
    .loading-state,
    .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
    }

    .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
    }

    .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
    to { transform: rotate(360deg); }
    }

    /* ========== RESPONSIVE ========== */
    @media (max-width: 768px) {
    .photo-upload-section {
        padding: 1rem;
    }

    .photos-grid {
        grid-template-columns: 1fr;
    }

    .list-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .stats-badges {
        width: 100%;
    }

    .badge {
        flex: 1;
        text-align: center;
    }
    }
    </style>