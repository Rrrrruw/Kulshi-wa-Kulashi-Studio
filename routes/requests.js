const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const SongRequest = require('../models/SongRequest');
const Song = require('../models/Song');
const { requireAdmin } = require('../middleware/adminAuth');
const { requireUser } = require('../middleware/userAuth');

// نفس مجلدات الرفع المستخدمة في routes/songs.js
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
  limits: { fileSize: 25 * 1024 * 1024 },
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

// POST /api/requests -> تقديم طلب رفع أغنية جديد — يحتاج تسجيل دخول بجوجل
router.post(
  '/',
  requireUser,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      const { title, artist, notes, audioUrl: linkAudioUrl } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'اسم الأغنية مطلوب' });
      }

      let audioUrl = linkAudioUrl || '';
      if (req.files && req.files.audio) {
        audioUrl = `/uploads/audio/${req.files.audio[0].filename}`;
      }

      if (!audioUrl) {
        return res.status(400).json({ message: 'يجب رفع ملف الأغنية أو إدخال رابط مباشر لها' });
      }

      const coverImageUrl = req.files && req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '';

      const request = new SongRequest({
        title,
        artist: artist || '',
        audioUrl,
        coverImageUrl,
        notes: notes || '',
        requestedBy: {
          googleId: req.user.googleId,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
        },
      });

      await request.save();
      res.status(201).json(request);
    } catch (err) {
      res.status(400).json({ message: 'تعذّر إرسال الطلب', error: err.message });
    }
  }
);

// GET /api/requests/mine -> طلبات المستخدم الحالي فقط
router.get('/mine', requireUser, async (req, res) => {
  try {
    const requests = await SongRequest.find({ 'requestedBy.googleId': req.user.googleId }).sort({
      createdAt: -1,
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب طلباتك', error: err.message });
  }
});

// GET /api/requests -> كل الطلبات (فلترة اختيارية بالحالة) — للأدمن فقط
router.get('/', requireAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await SongRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات', error: err.message });
  }
});

// POST /api/requests/:id/approve -> موافقة على الطلب ونشره كأغنية فعلية — للأدمن فقط
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const request = await SongRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (request.status === 'approved') {
      return res.status(400).json({ message: 'هذا الطلب مقبول مسبقاً' });
    }

    const song = new Song({
      title: request.title,
      artist: request.artist,
      audioUrl: request.audioUrl,
      coverImageUrl: request.coverImageUrl,
    });
    await song.save();

    request.status = 'approved';
    request.reviewedAt = new Date();
    request.rejectReason = '';
    await request.save();

    res.json({ message: 'تم قبول الطلب ونشر الأغنية', request, song });
  } catch (err) {
    res.status(500).json({ message: 'تعذّرت الموافقة على الطلب', error: err.message });
  }
});

// POST /api/requests/:id/reject -> رفض الطلب — للأدمن فقط
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const request = await SongRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    request.status = 'rejected';
    request.rejectReason = reason || '';
    request.reviewedAt = new Date();
    await request.save();

    res.json({ message: 'تم رفض الطلب', request });
  } catch (err) {
    res.status(500).json({ message: 'تعذّر رفض الطلب', error: err.message });
  }
});

// DELETE /api/requests/:id -> حذف طلب نهائياً — للأدمن فقط
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const request = await SongRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });
    res.json({ message: 'تم حذف الطلب' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  }
});

module.exports = router;
