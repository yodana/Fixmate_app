import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router({ mergeParams: true }); // <-- important

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const apartmentId = req.params.id;
    const uploadDir = `./uploads/${apartmentId}/`;
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/:id/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const files = req.files;
    const apartmentId = req.params.id;
    const { message, userId } = req.body;

    if (!files || files.length === 0) return res.status(400).json({ error: 'Aucune photo fournie' });

    const uploadedPhotos = [];
    for (const file of files) {
      const photoData = {
        apartment_id: apartmentId,
        photo_url: `/uploads/${apartmentId}/${file.filename}`,
        message: message || '',
        status: 'pending',
        uploaded_at: new Date(),
        uploaded_by: userId || 'cleaner'
      };

      const [result] = await new Promise((resolve, reject) => {
        req.db.query('INSERT INTO photos SET ?', photoData, (err, result) => {
          if (err) return reject(err);
          resolve([result]);
        });
      });

      uploadedPhotos.push({ id: result.insertId, ...photoData });
    }

    res.json({ success: true, message: `${files.length} photo(s) uploadée(s)`, photos: uploadedPhotos });
  } catch (err) {
    console.error('Upload error details:', err);
    return res.status(500).json({ success: false, error: err.message });
}

});

export default router;
