require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');

const songsRouter = require('./routes/songs');
const authRouter = require('./routes/auth');
const requestsRouter = require('./routes/requests');
const { ADMIN_CODE, ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, signAdminToken, isAdminAuthed } = require('./middleware/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/music_games_db';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-session-secret';

// إنشاء مجلدات رفع الملفات إذا لم تكن موجودة (الأغاني وأغلفتها)
const uploadDirs = [
  path.join(__dirname, 'public', 'uploads', 'audio'),
  path.join(__dirname, 'public', 'uploads', 'covers'),
];
uploadDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

app.use(cors());
app.use(express.json());

// جلسة تسجيل الدخول عبر Google (مخزّنة في MongoDB عشان تبقى بعد إعادة تشغيل السيرفر)
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// مسارات تسجيل الدخول بجوجل + معرفة هوية المستخدم الحالي
app.use('/auth', authRouter);

// تسجيل الدخول للوحة الأدمن بالرمز
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body || {};
  if (code === ADMIN_CODE) {
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE}=${signAdminToken()}; HttpOnly; Path=/; Max-Age=${ADMIN_COOKIE_MAX_AGE}; SameSite=Lax`
    );
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'الرمز غير صحيح' });
});

// تسجيل الخروج من لوحة الأدمن
app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.json({ success: true });
});

// حماية صفحة admin.html: لازم رمز صحيح قبل ما تنعرض
app.get('/admin.html', (req, res, next) => {
  if (isAdminAuthed(req)) return next(); // مسموح → يكمل لـ express.static ويعرض الصفحة الحقيقية
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// الملفات الثابتة (الواجهة الأمامية + ملفات الأغاني المرفوعة)
app.use(express.static(path.join(__dirname, 'public')));

// مسارات الـ API
app.use('/api/songs', songsRouter);
app.use('/api/requests', requestsRouter);

// أي رابط آخر يرجع الصفحة الرئيسية
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح');
    // التعديل هنا: تمرير '0.0.0.0' لفتح خط استقبال الترافيك الخارجي من الـ Proxy
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 السيرفر يعمل بنجاح ويستمع للمنفذ: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    process.exit(1);
  });
