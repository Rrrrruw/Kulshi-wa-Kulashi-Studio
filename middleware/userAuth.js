// يمنع الوصول لأي مسار يحتاج تسجيل دخول (بحساب Google) لو ما فيه جلسة مستخدم صالحة
function requireUser(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: 'يجب تسجيل الدخول عبر Google أولاً' });
}

module.exports = { requireUser };
