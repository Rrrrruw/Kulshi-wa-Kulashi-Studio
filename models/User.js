const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
