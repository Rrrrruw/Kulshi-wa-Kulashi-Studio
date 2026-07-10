const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn(
    '⚠️  تحذير: GOOGLE_CLIENT_ID أو GOOGLE_CLIENT_SECRET غير موجودين في ملف .env — تسجيل الدخول بجوجل لن يعمل حتى تضيفهم.'
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || 'missing-client-id',
      clientSecret: GOOGLE_CLIENT_SECRET || 'missing-client-secret',
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
        const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName || '',
            email,
            avatar,
          });
        } else {
          // تحديث الاسم/الصورة لو تغيّروا بحساب جوجل
          user.name = profile.displayName || user.name;
          user.email = email || user.email;
          user.avatar = avatar || user.avatar;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
