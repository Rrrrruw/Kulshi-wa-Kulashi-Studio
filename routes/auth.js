const express = require('express');
const passport = require('passport');
const router = express.Router();

// بدء تسجيل الدخول عبر Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// الرابط اللي يرجعنا له جوجل بعد ما المستخدم يوافق
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/request-song.html?login=failed',
  }),
  (req, res) => {
    res.redirect('/request-song.html');
  }
);

// تسجيل الخروج
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'تعذّر تسجيل الخروج' });
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

// معرفة هوية المستخدم الحالي (تُستخدم من الواجهة الأمامية)
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { id, name, email, avatar } = req.user;
    return res.json({ user: { id, name, email, avatar } });
  }
  return res.json({ user: null });
});

module.exports = router;
