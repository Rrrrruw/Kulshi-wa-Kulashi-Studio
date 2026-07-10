const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// GET /api/games -> جلب كل الألعاب
router.get('/', async (req, res) => {
  try {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json(games);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الألعاب', error: err.message });
  }
});

// GET /api/games/:id -> جلب لعبة واحدة
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'اللعبة غير موجودة' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  }
});

// POST /api/games -> إضافة لعبة جديدة
router.post('/', async (req, res) => {
  try {
    const game = new Game(req.body);
    await game.save();
    res.status(201).json(game);
  } catch (err) {
    res.status(400).json({ message: 'بيانات غير صحيحة', error: err.message });
  }
});

// PUT /api/games/:id -> تعديل لعبة
router.put('/:id', async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!game) return res.status(404).json({ message: 'اللعبة غير موجودة' });
    res.json(game);
  } catch (err) {
    res.status(400).json({ message: 'بيانات غير صحيحة', error: err.message });
  }
});

// DELETE /api/games/:id -> حذف لعبة
router.delete('/:id', async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).json({ message: 'اللعبة غير موجودة' });
    res.json({ message: 'تم حذف اللعبة' });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  }
});

module.exports = router;
