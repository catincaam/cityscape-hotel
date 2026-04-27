import fetch from "node-fetch";

const API_URL = "http://localhost:9001/api/rewards";

(async () => {
  try {
    // 1. Fetch rewards
    console.log("🔍 Fetching rewards...");
    let res = await fetch(API_URL);
    let rewards = await res.json();
    console.log("✅ Rewards:", rewards.map(r => ({ id: r.RewardId, title: r.title, type: r.rewardType })));
    
    if (rewards.length === 0) {
      console.log("❌ Nu sunt recompense!");
      process.exit(1);
    }
    
    const firstReward = rewards[0];
    console.log("\n🔄 Updating first reward...");
    console.log("Before:", { id: firstReward.RewardId, type: firstReward.rewardType });
    
    // 2. Update with rewardType
    res = await fetch(`${API_URL}/${firstReward.RewardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: firstReward.title,
        desc: firstReward.desc,
        points: firstReward.points,
        category: firstReward.category,
        rewardType: "per_person"  // Change to per_person
      })
    });
    
    const updated = await res.json();
    console.log("Response:", { id: updated.RewardId, type: updated.rewardType });
    
    // 3. Fetch again to verify
    console.log("\n🔄 Fetching again to verify...");
    res = await fetch(API_URL);
    rewards = await res.json();
    const verified = rewards.find(r => r.RewardId === firstReward.RewardId);
    console.log("Verified:", { id: verified.RewardId, type: verified.rewardType });
    
    if (verified.rewardType === "per_person") {
      console.log("\n✅ SUCCESS! rewardType saved correctly!");
    } else {
      console.log("\n❌ FAILED! rewardType is still:", verified.rewardType);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    process.exit(1);
  }
})();
