import React, { useEffect, useState } from "react";
import "./AdminRewards.css";
import "../services/AdminServices.css";
import { getAllRewards, createReward, updateReward, deleteReward } from "../../../services/rewardService";

const CATEGORIES = [
  { value: "Dining", label: "Dining", color: "bg-orange-100 text-orange-700" },
  { value: "Stay", label: "Stay", color: "bg-blue-100 text-blue-700" },
  { value: "Wellness", label: "Wellness", color: "bg-emerald-100 text-emerald-700" },
  { value: "Transfer", label: "Transfer", color: "bg-gray-100 text-gray-700" },
  { value: "Service", label: "Service", color: "bg-purple-100 text-purple-700" },
];

export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [form, setForm] = useState({ id: null, title: "", desc: "", points: "", category: "Dining", rewardType: "per_booking", active: true, image: null });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRewards();
  }, []);

  async function fetchRewards() {
    setLoading(true);
    setError("");
    try {
      const data = await getAllRewards();
      console.log("Rewards loaded:", data);
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

  function removeImage(index) {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
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

    // Pentru create - trebuie imagine
    if (!form.id && images.length === 0) {
      setError("At least one image is required for a new reward!");
      setLoading(false);
      return;
    }

    try {
      if (form.id) {
        // UPDATE
        let finalImage = form.image;

        // If new images are uploaded, use them
        if (images.length > 0) {
          const formData = new FormData();
          images.forEach(img => formData.append('images', img));
          
          const uploadRes = await fetch('http://localhost:9001/api/upload/multiple', {
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
          rewardType: form.rewardType || 'per_booking',
          active: form.active,
          image: finalImage
        });
        console.log('✅ Updated reward with rewardType:', form.rewardType);
        alert("Recompensă actualizată cu succes!");
      } else {
        // CREATE - trebuie imagine
        // Upload images
        const formData = new FormData();
        images.forEach(img => formData.append('images', img));
        
        const uploadRes = await fetch('http://localhost:9001/api/upload/multiple', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.imageUrls || uploadData.imageUrls.length === 0) {
          throw new Error("Nu s-au primesc URLs de imagini de la server");
        }

        const imageUrls = uploadData.imageUrls;

        // Create reward
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

        alert("Recompensă adăugată cu succes!");
      }

      setForm({ id: null, title: "", desc: "", points: "", category: "Dining", rewardType: "per_booking", active: true, image: null });
      setImages([]);
      setPreviews([]);
      await fetchRewards();
    } catch (err) {
      setError(err.message || "Eroare la operație!");
    } finally {
      setLoading(false);
    }
  }

  const filteredRewards = rewards.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.desc && r.desc.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleToggle(rewardId, currentActive) {
    try {
      setLoading(true);
      await updateReward(rewardId, { active: !currentActive });
      await fetchRewards();
    } catch (err) {
      setError(err.message || "Error updating status");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(rewardId) {
    if (!window.confirm("Are you sure you want to delete this reward?")) return;
    
    try {
      setLoading(true);
      await deleteReward(rewardId);
      await fetchRewards();
      alert("Recompensă ștearsă cu succes!");

    } catch (err) {
      setError(err.message || "Eroare la ștergere");
    } finally {
      setLoading(false);
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="admin-rewards-main">
      <div>
        {/* Add New Reward Form - MODERN CARD DESIGN */}
        <div className="service-form-container">
          <div className="service-form-card">
            <h3>{form.id ? 'Edit Reward' : 'Add New Reward'}</h3>
            <form onSubmit={handleSubmit}>
              {/* REWARD DETAILS CARD */}
              <div className="form-section">
                <div className="section-title">Reward Details</div>
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>Reward Name</label>
                    <input
                      type="text"
                      placeholder="ex: Complimentary Spa Day"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Required Points</label>
                    <input
                      type="number"
                      placeholder="ex: 200"
                      value={form.points}
                      onChange={e => setForm({ ...form, points: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      required
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reward Type</label>
                    <select
                      value={form.rewardType}
                      onChange={e => setForm({ ...form, rewardType: e.target.value })}
                      required
                    >
                      <option value="per_booking">Per Booking</option>
                      <option value="per_person">Per Person</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DESCRIPTION CARD */}
              <div className="form-section">
                <div className="section-title">Description</div>
                <textarea
                  placeholder="Describe reward benefits and conditions..."
                  value={form.desc}
                  onChange={e => setForm({ ...form, desc: e.target.value })}
                  required
                  style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {/* STATUS CARD */}
              {form.id && (
                <div className="form-section">
                  <div className="section-title">Status</div>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={e => setForm({ ...form, active: e.target.checked })}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              )}

              {/* IMAGE CARD */}
              <div className="form-section">
                <div className="section-title">Reward Image</div>
                {form.id && form.image && !previews.length && (
                  <div style={{marginBottom: '16px'}}>
                    <p style={{fontSize: '0.85rem', color: '#718096', marginBottom: '8px'}}>Current image:</p>
                    <img 
                      src={`http://localhost:9001${form.image}`} 
                      alt="current"
                      style={{maxWidth: '150px', maxHeight: '150px', borderRadius: '8px'}}
                    />
                  </div>
                )}
                <label className="image-upload-box">
                  <input type="file" accept="image/*" hidden onChange={handleImages} />
                  <div className="upload-content">
                    <p>{previews.length ? 'Change image' : 'Upload image'}</p>
                    <small>PNG, JPG, max 5MB</small>
                  </div>
                </label>
                {previews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '16px' }}>
                    {previews.map((preview, index) => (
                      <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <img src={preview} alt={`preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239,68,68,0.95)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ERROR MESSAGE */}
              {error && <div style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>{error}</div>}

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" disabled={loading} className="btn-submit">
                  {form.id ? 'Update Reward' : 'Add Reward'}
                </button>
                {form.id && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setForm({ id: null, title: "", desc: "", points: "", category: "Dining", active: true, image: null });
                      setImages([]);
                      setPreviews([]);
                      setError("");
                    }}
                    style={{
                      background: '#e5e7eb',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      height: '48px',
                      transition: 'background 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Rewards List */}
        <div className="admin-rewards-list-card">
          <h3>Reward List ({filteredRewards.length})</h3>
          
          <div className="admin-rewards-list-header">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search reward..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {loading ? (
            <div className="loading-message">Loading rewards...</div>
          ) : filteredRewards.length === 0 ? (
            <div className="empty-message">No rewards added yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Reward</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Points</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRewards.map((r) => {
                  const categoryObj = CATEGORIES.find(c => c.value === (r.category || "Dining"));
                  return (
                    <tr key={r.RewardId}>
                      <td>
                        {r.image ? (
                          <img
                            src={`http://localhost:9001${r.image}`}
                            alt={r.title}
                            className="reward-table-image"
                          />
                        ) : (
                          <div className="no-image">[No Image]</div>
                        )}
                      </td>
                      <td>
                        <strong>{r.title}</strong>
                        <div className="muted">{r.desc}</div>
                      </td>
                      <td>{r.category || "Dining"}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: r.rewardType === 'per_person' ? '#dbeafe' : '#fef3c7',
                          color: r.rewardType === 'per_person' ? '#1e40af' : '#92400e'
                        }}>
                          {r.rewardType === 'per_person' ? 'PER PERSON' : 'PER BOOKING'}
                        </span>
                      </td>
                      <td>
                        <span className="reward-points-badge">{r.points} pts</span>
                      </td>
                      <td>
                        <span className={`status-badge ${r.active !== false ? 'active' : 'inactive'}`}>
                          {r.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="edit-action-btn" 
                          onClick={() => handleEdit(r)}
                          disabled={loading}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-action-btn"
                          onClick={() => handleDelete(r.RewardId)}
                          disabled={loading}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
