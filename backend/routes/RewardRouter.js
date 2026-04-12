import express from 'express';
import Reward from '../entities/Reward.js';
import RewardPoint from '../entities/RewardPoint.js';
import Reservation from '../entities/Reservation.js';

const router = express.Router();

// GET toate recompensele
router.get('/', async (req, res) => {
  try {
    const rewards = await Reward.findAll();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Eroare la listare recompense' });
  }
});

// POST adaugă recompensă nouă
router.post('/', async (req, res) => {
  try {
    const { title, desc, points, image, category } = req.body;

    if (!title || !desc || !points || !category) {
      return res.status(400).json({ error: 'Titlu, descriere, puncte și categorie sunt obligatorii' });
    }

    const reward = await Reward.create({ 
      title: title.trim(),
      desc: desc.trim(),
      points: parseInt(points),
      image: image || null,
      category: category.trim()
    });

    console.log('✅ Recompensă adăugată:', reward);
    res.json(reward);
  } catch (err) {
    console.error('❌ Eroare la adăugare recompensă:', err);
    res.status(500).json({ error: err.message || 'Eroare la adăugare recompensă' });
  }
});

// POST - Apply reward to a stay
router.post('/apply', async (req, res) => {
  try {
    const { userId, rewardId, reservationId, points } = req.body;

    if (!userId || !rewardId || !reservationId || !points) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user has enough points
    const userPoints = await RewardPoint.findAll({
      where: { UserId: userId, status: 'active' }
    });

    const totalPoints = userPoints.reduce((sum, p) => sum + p.amount, 0);
    if (totalPoints < points) {
      return res.status(400).json({ message: "Not enough points" });
    }

    // Deduct points from user
    await RewardPoint.create({
      UserId: userId,
      ReservationId: reservationId,
      amount: -points,
      description: `Reward redeemed: ${rewardId}`,
      status: 'redeemed'
    });

    res.json({ message: "Reward applied successfully" });
  } catch (err) {
    console.error("Error applying reward:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// POST - Add test points for user (dev only)
router.post('/test-add-points', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ message: "Missing userId or amount" });
    }

    const points = await RewardPoint.create({
      UserId: parseInt(userId),
      amount: parseInt(amount),
      description: 'Test points added',
      status: 'active',
      availableAt: new Date()
    });

    console.log(`✅ Test points added: ${amount}p for user ${userId}`);
    res.json({ message: "Test points added", points });
  } catch (err) {
    console.error("Error adding test points:", err);
    res.status(500).json({ message: "server error", error: err.message });
  }
});

// PUT actualizează recompensă
router.put('/:id', async (req, res) => {
  try {
    const { title, desc, points, image, category, active } = req.body;
    const reward = await Reward.findByPk(req.params.id);

    if (!reward) {
      return res.status(404).json({ error: 'Recompensă nu găsită' });
    }

    await reward.update({
      title: title !== undefined ? title.trim() : reward.title,
      desc: desc !== undefined ? desc.trim() : reward.desc,
      points: points !== undefined ? parseInt(points) : reward.points,
      image: image !== undefined ? image : reward.image,
      category: category !== undefined ? category.trim() : reward.category,
      active: active !== undefined ? active : reward.active
    });

    console.log('✅ Recompensă actualizată:', reward);
    res.json(reward);
  } catch (err) {
    console.error('❌ Eroare la actualizare recompensă:', err);
    res.status(500).json({ error: err.message || 'Eroare la actualizare recompensă' });
  }
});

// DELETE șterge recompensă
router.delete('/:id', async (req, res) => {
  try {
    const reward = await Reward.findByPk(req.params.id);

    if (!reward) {
      return res.status(404).json({ error: 'Recompensă nu găsită' });
    }

    await reward.destroy();
    console.log('✅ Recompensă ștearsă:', reward.RewardId);
    res.json({ message: 'Recompensă ștearsă cu succes' });
  } catch (err) {
    console.error('❌ Eroare la ștergere recompensă:', err);
    res.status(500).json({ error: err.message || 'Eroare la ștergere recompensă' });
  }
});

// Pentru import ES module
export default router;
