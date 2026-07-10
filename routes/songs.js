const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Song = require('../models/Song');
const { requireAdmin } = require('../middleware/adminAuth');

// إعداد تخزين الملفات المرفوعة (الأغنية + الغلاف)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'cover' ? 'covers' : 'audio';
    cb(null, path.join(__dirname, '..', 'public', 'uploads', folder));
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 ميجابايت كحد أقصى لكل ملف
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) {
      return cb(new Error('يجب أن يكون ملف الأغنية بصيغة صوتية (mp3, wav, m4a)'));
    }
    if (file.fieldname === 'cover' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('يجب أن يكون ملف الغلاف صورة'));
    }
    cb(null, true);
  },
});

// POST /api/songs/upload -> إضافة أغنية (برفع ملف صوتي، أو برابط مباشر + صورة غلاف) — للأدمن فقط
router.post(
  '/upload',
  requireAdmin,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { title, artist, album, genre, releaseYear, audioUrl: linkAudioUrl } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'اسم الأغنية مطلوب' });
      }

      // الصوت: إما ملف مرفوع فعلياً، أو رابط مباشر مُرسل من لوحة المطورين
      let audioUrl = linkAudioUrl || '';
      if (req.files && req.files.audio) {
        audioUrl = `/uploads/audio/${req.files.audio[0].filename}`;
      }

      if (!audioUrl) {
        return res.status(400).json({ message: 'يجب رفع ملف الأغنية أو إدخال رابط مباشر لها' });
      }

      // الغلاف: صورة مرفوعة كملف من لوحة المطورين
      const coverImageUrl = req.files && req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '';

      const song = new Song({
        title,
        artist: artist || '',
        album,
        genre,
        releaseYear: releaseYear ? Number(releaseYear) : undefined,
        audioUrl,
        coverImageUrl,
      });

      await song.save();
      res.status(201).json(song);
    } catch (err) {
      res.status(400).json({ message: 'تعذّرت إضافة الأغنية', error: err.message });
    }
  }
);

// GET /api/songs -> جلب كل الأغاني
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الأغاني', error: err.message });
  }
});

// GET /api/songs/:id -> جلب أغنية واحدة
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'الأغنية غير موجودة' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  }
});

// POST /api/songs -> إضافة أغنية جديدة — للأدمن فقط
router.post('/', requireAdmin, async (req, res) => {
  try {
    const song = new Song(req.body);
    await song.save();
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({ message: 'بيانات غير صحيحة', error: err.message });
  }
});

// PUT /api/songs/:id -> تعديل أغنية — للأدمن فقط
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!song) return res.status(404).json({ message: 'الأغنية غير موجودة' });
    res.json(song);
  } catch (err) {
    res.status(400).json({ message: 'بيانات غير صحيحة', error: err.message });
  }
});

// DELETE /api/songs/:id -> حذف أغنية — للأدمن فقط
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ message: 'الأغنية غير موجودة' });
    res.json({ message: 'تم حذف الأغنية' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  }
});

module.exports = router;
