import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router({ mergeParams: true });

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const apartmentId = req.params.id;
    const uploadDir = `./uploads/${apartmentId}/`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==================== UPLOAD PHOTOS ====================
router.post('/:id/photos', upload.array('photos', 10), async (req, res) => {
  console.log('📤 POST /:id/photos - Upload');
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  console.log('Files:', req.files ? req.files.length : 0);

  try {
    const files = req.files;
    const apartmentId = req.params.id;
    const { message, userId } = req.body;

    if (!files || files.length === 0) {
      console.log('❌ Aucun fichier reçu');
      return res.status(400).json({ error: 'Aucune photo fournie' });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      const photoData = {
        apartment_id: apartmentId,
        photo_url: `/uploads/${apartmentId}/${file.filename}`,
        message: message || '',
        status: 'pending',
        uploaded_at: new Date(),
        uploaded_by: userId || 'unknown'
      };

      console.log('📝 Inserting photo:', photoData);

      const result = await new Promise((resolve, reject) => {
        req.db.query('INSERT INTO photos SET ?', photoData, (err, result) => {
          if (err) {
            console.error('❌ Insert error:', err);
            return reject(err);
          }
          resolve(result);
        });
      });

      uploadedPhotos.push({ id: result.insertId, ...photoData });
    }

    console.log('✅ Upload success:', uploadedPhotos.length, 'photos');
    res.json({ 
      success: true, 
      message: `${files.length} photo(s) uploadée(s)`, 
      photos: uploadedPhotos 
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== GET PHOTOS ====================
router.get('/:id/photos', async (req, res) => {
  console.log('🔍 GET /:id/photos');
  console.log('Params:', req.params);
  console.log('Query:', req.query);

  try {
    const apartmentId = req.params.id;
    const { role } = req.query;

    let query = `
      SELECT p.*
      FROM photos p
      WHERE p.apartment_id = ?
      ORDER BY p.uploaded_at DESC
    `;

    const photos = await new Promise((resolve, reject) => {
      req.db.query(query, [apartmentId], (err, results) => {
        if (err) {
          console.error('❌ Query error:', err);
          return reject(err);
        }
        resolve(results);
      });
    });

    console.log('✅ Photos found:', photos.length);
    res.json(photos);
  } catch (err) {
    console.error('❌ Get photos error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== GET STATS ====================
router.get('/:id/photos/stats', async (req, res) => {
  console.log('📊 GET /:id/photos/stats');
  console.log('Params:', req.params);

  try {
    const apartmentId = req.params.id;

    const stats = await new Promise((resolve, reject) => {
      req.db.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected
         FROM photos 
         WHERE apartment_id = ?`,
        [apartmentId],
        (err, results) => {
          if (err) {
            console.error('❌ Stats query error:', err);
            return reject(err);
          }
          const result = results[0] || { pending: 0, approved: 0, rejected: 0 };
          resolve(result);
        }
      );
    });

    console.log('✅ Stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('❌ Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== UPDATE PHOTO STATUS (approve/reject) ====================
router.patch('/photos/:photoId/status', async (req, res) => {
  console.log('✏️ PATCH /photos/:photoId/status');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  try {
    const { photoId } = req.params;
    const { status, feedback, reviewedBy } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({ error: 'Status invalide' });
    }

    const updateData = {
      status,
      reviewed_at: new Date(),
      reviewed_by: reviewedBy || 'unknown'
    };

    if (feedback) {
      updateData.feedback = feedback;
    }

    console.log('📝 Updating photo with:', updateData);

    await new Promise((resolve, reject) => {
      req.db.query(
        'UPDATE photos SET ? WHERE id = ?',
        [updateData, photoId],
        (err, result) => {
          if (err) {
            console.error('❌ Update error:', err);
            return reject(err);
          }
          console.log('✅ Update result:', result);
          resolve(result);
        }
      );
    });

    console.log('✅ Photo status updated successfully');
    res.json({ 
      success: true, 
      message: `Photo ${status === 'approved' ? 'approuvée' : 'rejetée'}` 
    });
  } catch (err) {
    console.error('❌ Update status error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;