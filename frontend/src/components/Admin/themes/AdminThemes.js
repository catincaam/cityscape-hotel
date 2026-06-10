import { useEffect, useState, useMemo } from "react";
import {
  getRoomThemes,
  createRoomTheme,
  updateRoomTheme,
  uploadMultipleImages,
  deleteRoomTheme
} from "../../../services/roomThemeService";
import { API_BASE_URL } from "../../../config/runtimeUrls";
import "./AdminThemes.css";
import "../rewards/AdminRewards.css";

const AMENITIES = [
  "Free WiFi",
  "Breakfast included",
  "Jacuzzi",
  "Balcony / Terrace",
  "Ocean view",
  "Air conditioning",
  "Smart TV",
  "Mini-bar",
  "Safe",
  "Spa access"
];

const INITIAL_FORM_STATE = {
  city: "",
  continent: "",
  name: "",
  basePrice: "",
  maxGuests: 2,
  size: "",
  bedType: "",
  description: "",
  amenities: []
};

function imageUrl(path) {
  if (!path) return "";
  const value = typeof path === "string"
    ? path
    : path.imageUrl || path.ImageUrl || path.url || "";
  if (!value) return "";
  return value.startsWith("http") ? value : `${API_BASE_URL}${value}`;
}

function getAmenities(theme) {
  if (Array.isArray(theme.amenities)) return theme.amenities;
  if (typeof theme.amenities !== "string") return [];

  try {
    const amenities = JSON.parse(theme.amenities);
    return Array.isArray(amenities) ? amenities : [];
  } catch {
    return [];
  }
}

export default function AdminThemes() {
  const [themes, setThemes] = useState([]);
  const [themeImages, setThemeImages] = useState([]);
  const [themePreviews, setThemePreviews] = useState([]);
  const [themeImagePaths, setThemeImagePaths] = useState([]);
  const [galleryOrderChanged, setGalleryOrderChanged] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [showcaseImage, setShowcaseImage] = useState(null);
  const [showcasePreview, setShowcasePreview] = useState("");
  const [showcaseRemoved, setShowcaseRemoved] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [continentFilter, setContinentFilter] = useState('All');

  // Unique continents for filter and dropdown
  // List of all continents (fixed, no manual entry)
  const ALL_CONTINENTS = [
    "Africa",
    "Antarctica",
    "Asia",
    "Europe",
    "North America",
    "Oceania",
    "South America"
  ];

  // Auto-hide notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load themes
  useEffect(() => {
    fetchThemes();
  }, []);

  async function fetchThemes() {
    setLoading(true);
    try {
      const data = await getRoomThemes();
      setThemes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading themes:", err);
      setError("Error loading themes");
    }
    setLoading(false);
  }

  function handleThemeImages(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setThemeImages(files);
    setThemeImagePaths([]);
    setThemePreviews(files.map(file => URL.createObjectURL(file)));
    setGalleryOrderChanged(false);
  }

  function removeThemeImage(idx) {
    setThemeImages(prev => prev.filter((_, i) => i !== idx));
    setThemePreviews(prev => prev.filter((_, i) => i !== idx));
    setThemeImagePaths(prev => prev.filter((_, i) => i !== idx));
    setGalleryOrderChanged(true);
  }

  function moveGalleryImage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= themePreviews.length || fromIndex === toIndex) return;

    const reorder = (items) => {
      if (!Array.isArray(items) || items.length === 0) return items;
      const next = [...items];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    };

    setThemePreviews(prev => reorder(prev));
    setThemeImages(prev => reorder(prev));
    setThemeImagePaths(prev => reorder(prev));
    setGalleryOrderChanged(true);
  }

  function handleGalleryDrop(targetIndex) {
    if (draggedImageIndex === null) return;
    moveGalleryImage(draggedImageIndex, targetIndex);
    setDraggedImageIndex(null);
  }

  function handleShowcaseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowcaseImage(file);
    setShowcasePreview(URL.createObjectURL(file));
    setShowcaseRemoved(false);
  }

  function removeShowcaseImage() {
    setShowcaseImage(null);
    setShowcasePreview("");
    setShowcaseRemoved(true);
  }

  function toggleAmenity(amenity) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.city || !form.name || !form.basePrice) {
      setError("All required fields must be filled!");
      setLoading(false);
      return;
    }

    if (!editingId && themeImages.length === 0) {
      setError("At least one theme image is required!");
      setLoading(false);
      return;
    }

    if (!editingId && !showcaseImage) {
      setError("Showcase image is required!");
      setLoading(false);
      return;
    }

    try {
      let imagePaths = [];
      let showcasePath = null;

      if (themeImages.length > 0) {
        const uploadRes = await uploadMultipleImages(themeImages);
        imagePaths = uploadRes.imageUrls || [];
      } else if (editingId && galleryOrderChanged && themeImagePaths.length > 0) {
        imagePaths = themeImagePaths;
      }

      if (showcaseImage) {
        const showcaseUpload = await uploadMultipleImages([showcaseImage]);
        showcasePath = showcaseUpload.imageUrls ? showcaseUpload.imageUrls[0] : null;
      }

      const payload = {
        city: form.city.trim(),
        continent: form.continent || "",
        theme: form.name.trim(),
        name: form.name.trim(),
        basePrice: parseInt(form.basePrice),
        maxGuests: parseInt(form.maxGuests),
        size: form.size || "",
        bedType: form.bedType || "",
        description: form.description.trim(),
        amenities: form.amenities,
        images: imagePaths.length > 0 ? imagePaths : undefined,
        showcaseImage: showcasePath || (editingId && showcaseRemoved ? null : undefined)
      };

      if (editingId) {
        await updateRoomTheme(editingId, payload);
        setSuccess("Theme updated successfully!");
      } else {
        await createRoomTheme(payload);
        setSuccess("Theme created successfully!");
      }

      setForm(INITIAL_FORM_STATE);
      setEditingId(null);
      setThemeImages([]);
      setThemePreviews([]);
      setThemeImagePaths([]);
      setGalleryOrderChanged(false);
      setDraggedImageIndex(null);
      setShowcaseImage(null);
      setShowcasePreview("");
      setShowcaseRemoved(false);
      await fetchThemes();
    } catch (err) {
      setError(err.message || "Error creating theme!");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(theme) {
    setEditingId(theme.RoomThemeId);
    setForm({
      city: theme.city || "",
      continent: theme.continent || "",
      name: theme.name || "",
      basePrice: theme.basePrice || "",
      maxGuests: theme.maxGuests || 2,
      size: theme.size || "",
      bedType: theme.bedType || "",
      description: theme.description || "",
      amenities: getAmenities(theme)
    });
    setThemeImages([]);
    const existingImagePaths = Array.isArray(theme.images)
      ? theme.images.map(img => (typeof img === "string" ? img : img.imageUrl || img.ImageUrl || img.url || "")).filter(Boolean)
      : [];
    setThemeImagePaths(existingImagePaths);
    setThemePreviews(existingImagePaths.map(imageUrl).filter(Boolean));
    setGalleryOrderChanged(false);
    setDraggedImageIndex(null);
    setShowcaseImage(null);
    setShowcasePreview(imageUrl(theme.showcaseImage));
    setShowcaseRemoved(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(INITIAL_FORM_STATE);
    setThemeImages([]);
    setThemePreviews([]);
    setThemeImagePaths([]);
    setGalleryOrderChanged(false);
    setDraggedImageIndex(null);
    setShowcaseImage(null);
    setShowcasePreview("");
    setShowcaseRemoved(false);
    setError("");
  }

  const filteredThemes = useMemo(() => {
    return themes.filter(t => {
      const matchesSearch =
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.city?.toLowerCase().includes(search.toLowerCase()) ||
        t.theme?.toLowerCase().includes(search.toLowerCase());
      const matchesContinent =
        continentFilter === 'All' || (t.continent && t.continent.toLowerCase() === continentFilter.toLowerCase());
      return matchesSearch && matchesContinent;
    });
  }, [themes, search, continentFilter]);

  function handleDelete(themeId) {
    const theme = themes.find(t => t.RoomThemeId === themeId);
    setDeleteConfirmTitle(theme?.name || "this theme");
    setDeleteConfirm(themeId);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      setThemes(themes.filter(t => t.RoomThemeId !== deleteConfirm));
      await deleteRoomTheme(deleteConfirm);
      setSuccess("Theme deleted successfully!");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    } catch (err) {
      await fetchThemes();
      setError(err.message || "Error deleting theme");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    }
  }

  function cancelDelete() {
    setDeleteConfirm(null);
    setDeleteConfirmTitle("");
  }

  return (
    <div className="admin-rewards-container">
      {/* HERO SECTION */}
      <div className="rewards-hero">
        <h1>Theme Architecture</h1>
        <p>Refine the visual soul of your properties. Orchestrate atmosphere through curated themes that define the guest experience across the globe.</p>
      </div>

      {/* FORM + PREVIEW SECTION */}
      <div className="rewards-creation-section">
        {/* LEFT: FORM */}
        <div className="rewards-form-wrapper">
          <div className="form-header">
            <h2>{editingId ? "Edit Theme" : "Add New Theme"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="rewards-form">
            {/* LOCATION */}
            <div className="form-row-2">
              <div className="form-field">
                <label>City</label>
                <input
                  type="text"
                  placeholder="e.g., Tokyo"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Continent</label>
                <select
                  value={form.continent}
                  onChange={e => setForm({ ...form, continent: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">Select continent</option>
                  {ALL_CONTINENTS.map(cont => (
                    <option key={cont} value={cont}>{cont}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* THEME NAME */}
            <div className="form-field">
              <label>Theme Name</label>
              <input
                type="text"
                placeholder="e.g., Tokyo Neon"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* PRICE & GUESTS */}
            <div className="form-row-2">
              <div className="form-field">
                <label>Base Price (EUR)</label>
                <div className="points-input-wrapper">
                  <input
                    type="number"
                    placeholder="e.g., 450"
                    value={form.basePrice}
                    onChange={e => setForm({ ...form, basePrice: e.target.value })}
                    required
                    className="form-input points-input"
                  />
                  <span className="points-label">EUR</span>
                </div>
              </div>

              <div className="form-field">
                <label>Max Guests</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxGuests}
                  onChange={e => setForm({ ...form, maxGuests: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* SIZE & BED */}
            <div className="form-row-2">
              <div className="form-field">
                <label>Room Size (m²)</label>
                <input
                  type="text"
                  placeholder="e.g., 65"
                  value={form.size}
                  onChange={e => setForm({ ...form, size: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label>Bed Type</label>
                <input
                  type="text"
                  placeholder="e.g., King"
                  value={form.bedType}
                  onChange={e => setForm({ ...form, bedType: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="form-field">
              <label>Editorial Description</label>
              <textarea
                placeholder="Describe the atmosphere..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="form-textarea"
                rows="4"
              />
            </div>

            {/* AMENITIES */}
            <div className="form-field">
              <label>Amenities</label>
              <div className="amenities-grid">
                {AMENITIES.map(a => (
                  <label key={a} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(a)}
                      onChange={() => toggleAmenity(a)}
                    />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* IMAGE UPLOAD - THEME IMAGES */}
            <div className="form-field">
              <label>Theme Images (Gallery)</label>
              <label className="image-upload-box">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  hidden 
                  onChange={handleThemeImages}
                />
                <div className="upload-content">
                  <div className="upload-icon">⬆</div>
                  <p>{editingId ? "Replace gallery images or browse" : "Drop theme images here or browse"}</p>
                  <small>{editingId ? "New images replace the current room gallery" : "Multiple images recommended"}</small>
                </div>
              </label>

              {themePreviews.length > 0 && (
                <div className="preview-thumbnails">
                  {themePreviews.map((preview, idx) => (
                    <div
                      key={`${preview}-${idx}`}
                      className={`thumbnail gallery-thumbnail ${idx === 0 ? "primary-thumbnail" : ""}`}
                      draggable
                      onDragStart={() => setDraggedImageIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleGalleryDrop(idx)}
                      onDragEnd={() => setDraggedImageIndex(null)}
                    >
                      {idx === 0 && <span className="primary-image-badge">Main</span>}
                      <img src={preview} alt={`theme-${idx}`} />
                      <div className="thumbnail-order-controls">
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label="Move image left"
                        >
                          &lt;
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(idx, idx + 1)}
                          disabled={idx === themePreviews.length - 1}
                          aria-label="Move image right"
                        >
                          &gt;
                        </button>
                      </div>
                      {themeImages.length > 0 && (
                        <button
                          type="button"
                          className="thumbnail-remove"
                          onClick={() => removeThemeImage(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SHOWCASE IMAGE UPLOAD */}
            <div className="form-field">
              <label>Showcase Image</label>
              <label className="image-upload-box">
                <input 
                  type="file" 
                  accept="image/*" 
                  hidden 
                  onChange={handleShowcaseImage}
                />
                <div className="upload-content">
                  <div className="upload-icon">⬆</div>
                  <p>Drop showcase image here or browse</p>
                  <small>Single high-quality image</small>
                </div>
              </label>

              {showcasePreview && (
                <div className="showcase-preview">
                  <img src={showcasePreview} alt="showcase" />
                  <button
                    type="button"
                    className="thumbnail-remove"
                    onClick={removeShowcaseImage}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* ERROR MESSAGE */}
            {error && <div className="error-message">{error}</div>}

            {/* BUTTON */}
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {editingId ? "Update Theme" : "Publish Theme"}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
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
            {showcasePreview && <span className="preview-dot">● Visualizing live data</span>}
          </div>

          {showcasePreview ? (
            <div className="preview-card premium-preview-card">
              <div className="preview-image-wrapper">
                <img src={showcasePreview} alt="preview" className="preview-image" />
                <div className="preview-badge">{form.basePrice} EUR</div>
              </div>

              <div className="preview-content">
                <div className="preview-live-strip">
                  <span>{form.continent || "Destination"}</span>
                  <span>{form.maxGuests || "--"} guests</span>
                </div>
                <div className="preview-category">{form.city}</div>
                <h3 className="preview-title">{form.name || "Theme Name"}</h3>
                <p className="preview-description">{form.description || "Theme description will appear here"}</p>
                
                <div className="preview-meta">
                  <span className="meta-item">
                    <span className="meta-label">Location:</span>
                    <span className="meta-value">{form.city}, {form.continent}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Starting From:</span>
                    <span className="meta-value">{form.basePrice} EUR /night</span>
                  </span>
                </div>

                <button className="preview-btn" disabled>Live View Rendering</button>
              </div>
            </div>
          ) : (
            <div className="preview-empty premium-preview-empty">
              <div className="empty-icon">🎨</div>
              <div className="preview-blueprint theme-blueprint">
                <span />
                <span />
                <span />
              </div>
              <strong>Theme preview needs a hero image</strong>
              <p>Upload a showcase image and the room story will appear as a polished guest card.</p>
            </div>
          )}
        </div>
      </div>

      {/* EXISTING THEMES */}
      <div className="existing-inventory">
        <div className="inventory-header">
          <h2>Active Room Themes</h2>
          <p>Review and update the themed rooms shown to guests.</p>
        </div>

        {/* SEARCH */}
        <div className="inventory-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search themes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-pills">
            <button
              className={`pill${continentFilter === 'All' ? ' active' : ''}`}
              onClick={() => setContinentFilter('All')}
              type="button"
            >
              All
            </button>
            {ALL_CONTINENTS.map(cont => (
              <button
                key={cont}
                className={`pill${continentFilter.toLowerCase() === cont.toLowerCase() ? ' active' : ''}`}
                onClick={() => setContinentFilter(cont)}
                type="button"
              >
                {cont}
              </button>
            ))}
          </div>
        </div>

        {/* THEMES GRID */}
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredThemes.length === 0 ? (
          <div className="empty-state">No themes yet. Create your first one above!</div>
        ) : (
          <div className="rewards-grid">
            {filteredThemes.map(t => (
              <div key={t.RoomThemeId} className="reward-card">
                <div className="reward-card-image">
                  {t.showcaseImage ? (
                    <img src={imageUrl(t.showcaseImage)} alt={t.name} />
                  ) : t.images && t.images.length > 0 ? (
                    <img src={imageUrl(t.images[0])} alt={t.name} />
                  ) : (
                    <div className="no-image">[No Image]</div>
                  )}
                  <div className="reward-card-badge">{t.basePrice} EUR</div>
                </div>

                <div className="reward-card-content">
                  <div className="reward-card-category">{t.city}</div>
                  <h4 className="reward-card-title">{t.name}</h4>
                  <p className="reward-card-desc">{t.description}</p>
                </div>

                <div className="reward-card-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(t)} title="Edit">
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(t.RoomThemeId)} title="Delete">
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
              <h3>Delete Theme?</h3>
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
