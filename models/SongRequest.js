const mongoose = require('mongoose');

const songRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, default: '', trim: true },
    audioUrl: { type: String, default: '' },
    coverImageUrl: { type: String, default: '' },
    notes: { type: String, default: '' }, // ملاحظة اختيارية من المستخدم لصاحب لوحة التحكم

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectReason: { type: String, default: '' },
    reviewedAt: { type: Date },

    // بيانات صاحب الطلب (المستخدم المسجّل دخوله عبر Google)
    requestedBy: {
      googleId: { type: String, required: true },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      avatar: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SongRequest', songRequestSchema);
