const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    platform: { type: String, default: '' }, // مثال: "متصفح", "PC", "موبايل"
    coverImageUrl: { type: String, default: '' },
    playUrl: { type: String, default: '' },
    releaseYear: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Game', gameSchema);
