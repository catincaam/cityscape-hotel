import express from 'express';
import Reward from '../entities/Reward.js';
import RewardPoint from '../entities/RewardPoint.js';
import Reservation from '../entities/Reservation.js';
import Client from '../entities/Client.js';
import { sendRewardRedeemedEmail } from '../services/emailService.js';

const router = express.Router();

// GET toate recompensele (doar active pentru users)
router.get('/', async (req, res) => {
  try {
    const rewards = await Reward.findAll({
      where: { active: true }
    });
    console.log('[GET REWARDS - USER]:', rewards.map(r => ({ RewardId: r.RewardId, title: r.title, rewardType: r.rewardType, active: r.active })));
    res.json(rewards);
  } catch (err) {
    console.error('[GET REWARDS - USER] Error:', err);
    res.status(500).json({ error: 'Eroare la listare recompense' });
  }
});

// GET toate recompensele (including inactive - ADMIN ONLY)
router.get('/admin/all', async (req, res) => {
  try {
    const rewards = await Reward.findAll();
    console.log('[GET REWARDS - ADMIN]:', rewards.map(r => ({ RewardId: r.RewardId, title: r.title, active: r.active })));
    res.json(rewards);
  } catch (err) {
    console.error('[GET REWARDS - ADMIN] Error:', err);
    res.status(500).json({ error: 'Eroare la listare recompense' });
  }
});

// POST adaugă recompensă nouă
router.post('/', async (req, res) => {
  try {
    const { title, desc, points, image, category, rewardType } = req.body;

    if (!title || !desc || !points || !category) {
      return res.status(400).json({ error: 'Titlu, descriere, puncte și categorie sunt obligatorii' });
    }

    const reward = await Reward.create({ 
      title: title.trim(),
      desc: desc.trim(),
      points: parseInt(points),
      image: image || null,
      category: category.trim(),
      rewardType: rewardType || 'per_booking'
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

    const reward = await Reward.findByPk(rewardId);
    const reservation = await Reservation.findByPk(reservationId);

    if (!reward) {
      return res.status(404).json({ message: "Reward not found" });
    }

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // Deduct points from user
    const redemption = await RewardPoint.create({
      UserId: userId,
      ReservationId: reservationId,
      amount: -points,
      description: `Reward redeemed: ${reward.title}`,
      status: 'redeemed'
    });

    let emailResult = { success: false, error: "Email was not attempted." };
    try {
      const client = await Client.findByPk(userId);
      emailResult = await sendRewardRedeemedEmail({
        client,
        reservation,
        reward,
        points
      });

      if (!emailResult.success) {
        console.warn("[REWARD EMAIL] Confirmation email not sent:", emailResult.error);
      }
    } catch (emailError) {
      emailResult = { success: false, error: emailError.message };
      console.error("[REWARD EMAIL ERROR]", emailError);
    }

    res.json({
      message: "Reward applied successfully",
      redemption,
      email: {
        sent: Boolean(emailResult.success),
        error: emailResult.success ? undefined : emailResult.error
      }
    });
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
    const { title, desc, points, image, category, rewardType, active } = req.body;
    const id = req.params.id;
    
    const reward = await Reward.findByPk(id);

    if (!reward) {
      return res.status(404).json({ error: 'Recompensă nu găsită' });
    }

    // Update all fields at once
    await reward.update({
      title: title !== undefined ? title.trim() : reward.title,
      desc: desc !== undefined ? desc.trim() : reward.desc,
      points: points !== undefined ? parseInt(points) : reward.points,
      image: image !== undefined ? image : reward.image,
      category: category !== undefined ? category.trim() : reward.category,
      rewardType: rewardType !== undefined ? rewardType : reward.rewardType,
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
