const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, default: '', trim: true },
    album: { type: String, default: '' },
    genre: { type: String, default: '' },
    duration: { type: String, default: '' }, // مثال: "3:45"
    coverImageUrl: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    releaseYear: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
