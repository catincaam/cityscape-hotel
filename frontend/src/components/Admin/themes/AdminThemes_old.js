import { useEffect, useState } from "react";
import {
  getRoomThemes,
  createRoomTheme,
  updateRoomTheme,
  uploadMultipleImages,
  deleteRoomTheme
} from "../../../services/roomThemeService";
import "./AdminThemes.css";
import "../services/AdminServices.css";

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

export default function AdminThemes() {
  const [themes, setThemes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  /* ADD FORM */
  const [form, setForm] = useState({
    city: "",
    continent: "",
    theme: "",
    name: "",
    basePrice: "",
    maxGuests: 2,
    size: "",
    bedType: "",
    description: "",
    amenities: []
  });

  const [themeImages, setThemeImages] = useState([]);
  const [themePreviews, setThemePreviews] = useState([]);
  const [showcaseImage, setShowcaseImage] = useState(null);
  const [showcasePreview, setShowcasePreview] = useState("");
  const [addError, setAddError] = useState("");

  /* ======================
     LOAD DATA
  ====================== */
  async function loadThemes() {
    try {
      const data = await getRoomThemes();
      setThemes(data || []);
    } catch {
      setError("Error loading themes");
    }
  }

  async function loadRooms() {
    try {
      const r = await fetch("http://localhost:9001/api/rooms");
      setRooms(await r.json());
    } catch {
      setRooms([]);
    }
  }

  useEffect(() => {
    loadThemes();
    loadRooms();
  }, []);

  /* ======================
     FORM HANDLERS
  ====================== */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function toggleAmenity(a) {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a]
    }));
  }

  function handleThemeImages(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setThemeImages(files);
    setThemePreviews(files.map(f => URL.createObjectURL(f)));
  }

  function removeImage(idx) {
    setThemeImages(prev => prev.filter((_, i) => i !== idx));
    setThemePreviews(prev => prev.filter((_, i) => i !== idx));
  }

  function handleShowcaseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowcaseImage(file);
    setShowcasePreview(URL.createObjectURL(file));
  }

  function removeShowcaseImage() {
    setShowcaseImage(null);
    setShowcasePreview("");
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setAddError("");

    try {
      let imagePaths = [];
      let showcasePath = null;

      if (themeImages.length > 0) {
        const uploadResult = await uploadMultipleImages(themeImages);
        imagePaths = uploadResult.imageUrls || [];
      }

      if (showcaseImage) {
        const showcaseUpload = await uploadMultipleImages([showcaseImage]);
        showcasePath = showcaseUpload.imageUrls ? showcaseUpload.imageUrls[0] : null;
      }

      const themePayload = {
        ...form,
        images: imagePaths.length > 0 ? imagePaths : undefined,
        showcaseImage: showcasePath || undefined
      };

      if (form.id) {
        // UPDATE existing theme
        await updateRoomTheme(form.id, themePayload);
        alert("Theme updated successfully!");
      } else {
        // CREATE new theme
        await createRoomTheme(themePayload);
        alert("Theme added successfully!");
      }

      setForm({
        id: null,
        city: "",
        continent: "",
        theme: "",
        name: "",
        basePrice: "",
        maxGuests: 2,
        size: "",
        bedType: "",
        description: "",
        amenities: []
      });

      setThemeImages([]);
      setThemePreviews([]);
      setShowcaseImage(null);
      setShowcasePreview("");

      await loadThemes();
    } catch (err) {
      setAddError("Error: " + (err.message || ""));
    }
  }

  /* ======================
     DELETE
  ====================== */
  async function handleDelete(theme) {
    const hasRooms = rooms.some(
      r => r.RoomThemeId === theme.RoomThemeId
    );

    if (hasRooms) {
      alert("Cannot delete theme: rooms are assigned to it.");
      return;
    }

    if (!window.confirm("Delete this theme?")) return;

    await deleteRoomTheme(theme.RoomThemeId);
    loadThemes();
  }

  /* ======================
     EDIT
  ====================== */
  function handleEdit(theme) {
    setForm({
      id: theme.RoomThemeId,
      city: theme.city,
      continent: theme.continent || "",
      theme: theme.theme,
      name: theme.name,
      basePrice: theme.basePrice.toString(),
      maxGuests: theme.maxGuests,
      size: theme.size || "",
      bedType: theme.bedType || "",
      description: theme.description || "",
      amenities: theme.amenities && typeof theme.amenities === 'string' 
        ? JSON.parse(theme.amenities) 
        : Array.isArray(theme.amenities) 
          ? theme.amenities 
          : []
    });
    setShowcaseImage(null);
    setShowcasePreview("");
    setThemeImages([]);
    setThemePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ======================
     FILTER
  ====================== */
  const filteredThemes = themes.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.city?.toLowerCase().includes(search.toLowerCase())
  );

  /* ======================
     JSX
  ====================== */
  return (
    <>
      {/* ADD THEME - MODERN CARD DESIGN */}
      <div className="service-form-container">
        <div className="service-form-card">
          <h3>{form.id ? 'Edit Theme' : 'Add New Theme'}</h3>

          <form onSubmit={handleAddSubmit}>
            {/* LOCATION INFO CARD */}
            <div className="form-section">
              <div className="section-title">Location Info</div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>City</label>
                  <input name="city" value={form.city} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Continent</label>
                  <select name="continent" value={form.continent} onChange={handleChange} required>
                    <option value="">Select Continent</option>
                    <option value="Asia">Asia</option>
                    <option value="Europa">Europa</option>
                    <option value="Africa">Africa</option>
                    <option value="North America">North America</option>
                    <option value="South America">South America</option>
                    <option value="Oceania">Oceania</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Theme</label>
                  <input name="theme" value={form.theme} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Base Price (EUR)</label>
                  <input type="number" name="basePrice" value={form.basePrice} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* ROOM DETAILS CARD */}
            <div className="form-section">
              <div className="section-title">Room Details</div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Max Guests</label>
                  <input type="number" name="maxGuests" value={form.maxGuests} onChange={handleChange} min="1" />
                </div>
                <div className="form-group">
                  <label>Room Size (m²)</label>
                  <input type="number" name="size" value={form.size} onChange={handleChange} placeholder="ex: 25" />
                </div>
                <div className="form-group">
                  <label>Bed Type</label>
                  <select name="bedType" value={form.bedType} onChange={handleChange}>
                    <option value="">Select Bed Type</option>
                    <option value="Single">Single</option>
                    <option value="Twin">Twin</option>
                    <option value="Queen">Queen</option>
                    <option value="King">King</option>
                    <option value="Super King">Super King</option>
                    <option value="Bunk">Bunk</option>
                    <option value="Sofa Bed">Sofa Bed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DESCRIPTION CARD */}
            <div className="form-section">
              <div className="section-title">Description</div>
              <textarea 
                name="description" 
                value={form.description} 
                onChange={handleChange}
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* AMENITIES CARD */}
            <div className="form-section">
              <div className="section-title">Amenities</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {AMENITIES.map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontSize: '0.95rem', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(a)}
                      onChange={() => toggleAmenity(a)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* IMAGES CARD */}
            <div className="form-section">
              <div className="section-title">Room Gallery Images</div>
              <label className="image-upload-box">
                <input type="file" accept="image/*" multiple hidden onChange={handleThemeImages} />
                <div className="upload-content">
                  <p>{themePreviews.length ? 'Change images' : 'Upload images'}</p>
                  <small>PNG, JPG, max 5MB each</small>
                </div>
              </label>
              {themePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  {themePreviews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <img src={src} alt={`preview ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239,68,68,0.95)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SHOWCASE IMAGE CARD */}
            <div className="form-section">
              <div className="section-title">Showcase for Homepage</div>
              <label className="image-upload-box">
                <input type="file" accept="image/*" hidden onChange={handleShowcaseImage} />
                <div className="upload-content">
                  <p>{showcasePreview ? 'Change image' : 'Upload image'}</p>
                  <small>Upload a photo of the city</small>
                </div>
              </label>
              {showcasePreview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <img src={showcasePreview} alt="showcase" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={removeShowcaseImage}
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239,68,68,0.95)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >✕</button>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR MESSAGE */}
            {addError && <div style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>{addError}</div>}

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn-submit">
                {form.id ? 'Update Theme' : 'Add Theme'}
              </button>
              {form.id && (
                <button 
                  type="button"
                  onClick={() => {
                    setForm({
                      id: null,
                      city: "",
                      continent: "",
                      theme: "",
                      name: "",
                      basePrice: "",
                      maxGuests: 2,
                      size: "",
                      bedType: "",
                      description: "",
                      amenities: []
                    });
                    setThemeImages([]);
                    setThemePreviews([]);
                    setShowcaseImage(null);
                    setShowcasePreview("");
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

      {/* LIST - MODERN TABLE */}
      <div className="admin-rewards-list-card">
        <h3>Theme List ({themes.length})</h3>
        <div className="admin-rewards-list-header">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search theme..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="admin-theme-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Room</th>
              <th>Theme</th>
              <th>City</th>
              <th>Guests</th>
              <th>Price/night</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredThemes.map(t => (
              <tr key={t.RoomThemeId}>
                <td>
                  {t.showcaseImage ? (
                    <img
                      src={`http://localhost:9001${t.showcaseImage}`}
                      alt={t.name}
                      className="reward-table-image"
                    />
                  ) : t.images?.length > 0 ? (
                    <img
                      src={`http://localhost:9001${t.images[0]}`}
                      alt={t.name}
                      className="reward-table-image"
                    />
                  ) : (
                    <div className="no-image">[No Image]</div>
                  )}
                </td>
                <td>
                  <strong>{t.name}</strong>
                </td>
                <td>{t.theme}</td>
                <td>{t.city}</td>
                <td>{t.maxGuests}</td>
                <td>{t.basePrice} EUR</td>
                <td style={{fontSize:'0.85rem',color:'#64748b'}}>{t.description}</td>
                <td className="actions-cell">
                  <button className="edit-action-btn" style={{
                    background: 'transparent',
                    color: '#c6a969',
                    border: '1px solid #c6a969',
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    transition: 'background 0.2s, color 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEdit(t)}
                  onMouseOver={e => { e.currentTarget.style.background = '#c6a969'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c6a969'; }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="delete-action-btn"
                    onClick={() => handleDelete(t)}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <div className="error">{error}</div>}
      </div>
    </>
  );
}