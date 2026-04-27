import React, { useEffect, useState, useMemo } from "react";
import "./AdminRewards.css";
import { getAllRewards, createReward, updateReward, deleteReward } from "../../../services/rewardService";

// CONFIG CONSTANTS
const CONFIG = {
  API_BASE_URL: "http://localhost:9001",
  UPLOAD_ENDPOINT: "/api/upload/multiple",
  NOTIFICATION_TIMERS: {
    SUCCESS: 3000,
    ERROR: 4000
  },
  DEFAULT_CATEGORY: "Dining",
  DEFAULT_REWARD_TYPE: "per_booking"
};

const INITIAL_FORM_STATE = { 
  id: null, 
  title: "", 
  desc: "", 
  points: "", 
  category: CONFIG.DEFAULT_CATEGORY, 
  rewardType: CONFIG.DEFAULT_REWARD_TYPE, 
  active: true, 
  image: null 
};

export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  useEffect(() => {
    fetchRewards();
  }, []);

  // Auto-hide notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), CONFIG.NOTIFICATION_TIMERS.SUCCESS);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), CONFIG.NOTIFICATION_TIMERS.ERROR);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function fetchRewards() {
    setLoading(true);
    try {
      const data = await getAllRewards();
      setRewards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading rewards:", err);
      setError("Error loading rewards");
    }
    setLoading(false);
  }

  function handleImages(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setImages(files);
    setPreviews(files.map(file => URL.createObjectURL(file)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.title || !form.desc || !form.points || !form.category) {
      setError("Title, description, points and category are required!");
      setLoading(false);
      return;
    }

    if (!form.id && images.length === 0) {
      setError("At least one image is required for a new reward!");
      setLoading(false);
      return;
    }

    try {
      if (form.id) {
        // UPDATE
        let finalImage = form.image;

        if (images.length > 0) {
          const formData = new FormData();
          images.forEach(img => formData.append('images', img));
          
          const uploadRes = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.UPLOAD_ENDPOINT}`, {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
          }

          const uploadData = await uploadRes.json();
          if (!uploadData.imageUrls || uploadData.imageUrls.length === 0) {
            throw new Error("No image URLs received from server");
          }

          finalImage = uploadData.imageUrls[0];
        }

        await updateReward(form.id, {
          title: form.title,
          desc: form.desc,
          points: form.points,
          category: form.category,
          rewardType: form.rewardType || CONFIG.DEFAULT_REWARD_TYPE,
          active: form.active,
          image: finalImage
        });
        setSuccess("Reward updated successfully!");
      } else {
        // CREATE
        const formData = new FormData();
        images.forEach(img => formData.append('images', img));
        
        const uploadRes = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.UPLOAD_ENDPOINT}`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.imageUrls || uploadData.imageUrls.length === 0) {
          throw new Error("No image URLs received from server");
        }

        const imageUrls = uploadData.imageUrls;

        const newReward = await createReward({
          title: form.title,
          desc: form.desc,
          points: form.points,
          category: form.category,
          rewardType: form.rewardType,
          image: imageUrls[0]
        });

        if (!newReward) {
          throw new Error("Error saving reward to database");
        }

        setSuccess("Reward added successfully!");
      }

      setForm(INITIAL_FORM_STATE);
      setImages([]);
      setPreviews([]);
      setEditingId(null);
      await fetchRewards();
    } catch (err) {
      setError(err.message || "Error during operation!");
    } finally {
      setLoading(false);
    }
  }

  const [categoryFilter, setCategoryFilter] = useState('All');

  // Compute unique categories from rewards data
  const uniqueCategories = Array.from(new Set(rewards.map(r => r.category).filter(Boolean)));

  // Filter rewards by search and category (case-insensitive)
  const filteredRewards = rewards.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.desc && r.desc.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'All' ||
      (r.category && r.category.toLowerCase() === categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  async function handleDelete(rewardId) {
    const reward = rewards.find(r => r.RewardId === rewardId);
    setDeleteConfirmTitle(reward?.title || "this reward");
    setDeleteConfirm(rewardId);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      // Remove from UI immediately (optimistic update)
      setRewards(rewards.filter(r => r.RewardId !== deleteConfirm));
      
      // Delete from backend
      await deleteReward(deleteConfirm);
      setSuccess("Reward deleted successfully!");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    } catch (err) {
      // If delete fails, reload from backend
      await fetchRewards();
      setError(err.message || "Error deleting reward");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    }
  }

  function cancelDelete() {
    setDeleteConfirm(null);
    setDeleteConfirmTitle("");
  }

  function handleEdit(reward) {
    setForm({
      id: reward.RewardId,
      title: reward.title,
      desc: reward.desc,
      points: reward.points.toString(),
      category: reward.category,
      rewardType: reward.rewardType || "per_booking",
      active: reward.active,
      image: reward.image
    });
    setEditingId(reward.RewardId);
    setImages([]);
    setPreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancel() {
    setForm(INITIAL_FORM_STATE);
    setImages([]);
    setPreviews([]);
    setError("");
    setEditingId(null);
  }

  const previewImage = previews.length > 0 ? previews[0] : (form.image ? `${CONFIG.API_BASE_URL}${form.image}` : null);
  const categoryLabel = form.category;

  return (
    <div className="admin-rewards-container">
      {/* HERO SECTION */}
      <div className="rewards-hero">
        <h1>Manage Rewards</h1>
        <p>Create and curate exclusive rewards for your guests</p>
      </div>

      {/* FORM + PREVIEW SECTION */}
      <div className="rewards-creation-section">
        {/* LEFT: FORM */}
        <div className="rewards-form-wrapper">
          <div className="form-header">
            <h2>{form.id ? "Edit Reward" : "Create Reward Entity"}</h2>
            {form.id && (
              <div className="form-status">
                <span className={`status-pill ${form.active ? 'active' : 'inactive'}`}>
                  {form.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="rewards-form">
            {/* REWARD NAME */}
            <div className="form-field">
              <label>Reward Name</label>
              <input
                type="text"
                placeholder="e.g., Royal Suite Afternoon Tea"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* CATEGORY & REWARD TYPE */}
            <div className="form-row-2">
              <div className="form-field">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="form-select"
                >
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {/* Optionally allow new category entry here if needed */}
                </select>
              </div>

              <div className="form-field">
                <label>Reward Type</label>
                <select
                  value={form.rewardType}
                  onChange={e => setForm({ ...form, rewardType: e.target.value })}
                  className="form-select"
                >
                  <option value="per_booking">Per Booking</option>
                  <option value="per_person">Per Person</option>
                </select>
              </div>
            </div>

            {/* REQUIRED POINTS */}
            <div className="form-field">
              <label>Required Points</label>
              <div className="points-input-wrapper">
                <input
                  type="number"
                  placeholder="e.g., 4500"
                  value={form.points}
                  onChange={e => setForm({ ...form, points: e.target.value })}
                  required
                  className="form-input points-input"
                />
                <span className="points-label">PTS</span>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="form-field">
              <label>Description</label>
              <textarea
                placeholder="Describe the reward and its benefits..."
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })}
                required
                className="form-textarea"
                rows="4"
              />
            </div>

            {/* IMAGE UPLOAD */}
            <div className="form-field">
              <label>Reward Image</label>
              <label className="image-upload-box">
                <input 
                  type="file" 
                  accept="image/*" 
                  hidden 
                  onChange={handleImages}
                />
                <div className="upload-content">
                  <div className="upload-icon">⬆</div>
                  <p>Drop high-resolution image here or browse</p>
                  <small>Recommended: 16:10 images</small>
                </div>
              </label>
            </div>

            {/* ACTIVE STATUS */}
            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>

            {/* ERROR MESSAGE */}
            {error && <div className="error-message">{error}</div>}

            {/* BUTTONS */}
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {form.id ? "Update Reward" : "Publish Reward"}
              </button>
              {form.id && (
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="rewards-preview-wrapper">
          <div className="preview-header">
            <span className="preview-label">Instant Preview</span>
            {previewImage && <span className="preview-dot">● Visualizing live data</span>}
          </div>

          {previewImage ? (
            <div className="preview-card">
              <div className="preview-image-wrapper">
                <img src={previewImage} alt="preview" className="preview-image" />
                <div className="preview-badge">{form.points || "XXX"} PTS</div>
              </div>

              <div className="preview-content">
                <div className="preview-category">{categoryLabel}</div>
                <h3 className="preview-title">{form.title || "Reward Title"}</h3>
                <p className="preview-description">{form.desc || "Reward description will appear here"}</p>
                
                <div className="preview-meta">
                  <span className="meta-item">
                    <span className="meta-label">Reward Type:</span>
                    <span className="meta-value">{form.rewardType === 'per_person' ? 'PER PERSON' : 'PER BOOKING'}</span>
                  </span>
                </div>

                <button className="preview-btn" disabled>Sample Action</button>
              </div>
            </div>
          ) : (
            <div className="preview-empty">
              <div className="empty-icon">📸</div>
              <p>Fill in the form and upload an image to see your reward preview here</p>
            </div>
          )}
        </div>
      </div>

      {/* EXISTING INVENTORY */}
      <div className="existing-inventory">
        <div className="inventory-header">
          <h2>Existing Inventory</h2>
          <p>Manage and curate your active guest rewards</p>
        </div>

        {/* SEARCH */}
        <div className="inventory-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search rewards..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-pills">
            <button
              className={`pill${categoryFilter === 'All' ? ' active' : ''}`}
              onClick={() => setCategoryFilter('All')}
              type="button"
            >
              All
            </button>
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                className={`pill${categoryFilter.toLowerCase() === cat.toLowerCase() ? ' active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* REWARDS GRID */}
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredRewards.length === 0 ? (
          <div className="empty-state">No rewards yet. Create your first one above!</div>
        ) : (
          <div className="rewards-grid">
            {filteredRewards.map(r => (
              <div key={r.RewardId} className="reward-card">
                <div className="reward-card-image">
                  {r.image ? (
                    <img src={`http://localhost:9001${r.image}`} alt={r.title} />
                  ) : (
                    <div className="no-image">[No Image]</div>
                  )}
                  <div className="reward-card-badge">{r.points} PTS</div>
                </div>

                <div className="reward-card-content">
                  <div className="reward-card-category">{r.category}</div>
                  <h4 className="reward-card-title">{r.title}</h4>
                  <p className="reward-card-desc">{r.desc}</p>

                  <div className="reward-card-meta">
                    <span className={`type-badge ${r.rewardType}`}>
                      {r.rewardType === 'per_person' ? 'PER PERSON' : 'PER BOOKING'}
                    </span>
                    <span className={`status-badge ${r.active ? 'active' : 'inactive'}`}>
                      {r.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="reward-card-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(r)} title="Edit">
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(r.RewardId)} title="Delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h3>Delete Reward?</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{deleteConfirmTitle}"</strong>?</p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn-delete" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {success && (
        <div className="toast toast-success">
          <div className="toast-icon">✓</div>
          <div className="toast-message">{success}</div>
        </div>
      )}

      {/* ERROR TOAST */}
      {error && (
        <div className="toast toast-error">
          <div className="toast-icon">⚠</div>
          <div className="toast-message">{error}</div>
        </div>
      )}
    </div>
  );
}
