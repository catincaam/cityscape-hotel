import { useEffect, useState } from "react";
import { getRoomThemes, createRoomTheme, uploadMultipleImages } from "../../../services/roomThemeService";
import "./AdminThemes.css";

const AMENITIES = [
  "WiFi gratuit",
  "Mic dejun",
  "Jacuzzi",
  "Balcon",
  "Vedere ocean",
  "Aer condiționat",
  "TV Smart",
  "Mini-bar",
  "Seif",
  "Spa access"
];

export default function AdminThemes() {
  const [themes, setThemes] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [form, setForm] = useState({
    city: "",
    theme: "",
    name: "",
    basePrice: "",
    maxGuests: 2,
    size: "",
    bedType: "",
    description: "",
    amenities: []
  });

  /* ======================
     LOAD THEMES
  ====================== */
  async function loadThemes() {
    try {
      const data = await getRoomThemes();
      setThemes(data);
    } catch (err) {
      console.error("Eroare la încărcarea temelor:", err);
    }
  }

  useEffect(() => {
    loadThemes();
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

  /* ======================
     SUBMIT
  ====================== */
  async function handleSubmit(e) {
    e.preventDefault();

    if (images.length === 0) {
      alert("Selectează cel puțin o imagine pentru temă.");
      return;
    }

    try {
      /* UPLOAD IMAGES */
      const { imageUrls } = await uploadMultipleImages(images);

      /* CREATE THEME */
      await createRoomTheme({
        ...form,
        basePrice: Number(form.basePrice),
        maxGuests: Number(form.maxGuests),
        size: Number(form.size),
        image: imageUrls[0], // Prima imagine e principală (backward compatibility)
        images: imageUrls
      });

      /* RESET */
      setForm({
        city: "",
        theme: "",
        name: "",
        basePrice: "",
        maxGuests: 2,
        size: "",
        bedType: "",
        description: "",
        amenities: []
      });
      setImages([]);
      setPreviews([]);

      await loadThemes();
      alert("Temă adăugată cu succes!");
    } catch (err) {
      console.error("Eroare:", err);
      alert("Eroare la adăugarea temei: " + err.message);
    }
  }

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="admin-themes">
      {/* ADD THEME */}
      <div className="add-theme-form">
        <h3>Adaugă temă nouă</h3>

        <form onSubmit={handleSubmit}>
          <div className="theme-form-grid">
            <div className="form-group">
              <label>Oraș</label>
              <input
                name="city"
                placeholder="ex: Tokyo, Paris"
                value={form.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Temă</label>
              <input
                name="theme"
                placeholder="ex: Neon, Loft"
                value={form.theme}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Nume complet</label>
              <input
                name="name"
                placeholder="ex: Tokyo Neon Suite"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Preț bază (RON/noapte)</label>
              <input
                type="number"
                name="basePrice"
                value={form.basePrice}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Max. oaspeți</label>
              <input
                type="number"
                name="maxGuests"
                value={form.maxGuests}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Dimensiune (m²)</label>
              <input
                type="number"
                name="size"
                value={form.size}
                onChange={handleChange}
              />
            </div>

            <div className="form-group full">
              <label>Tip pat</label>
              <select
                name="bedType"
                value={form.bedType}
                onChange={handleChange}
                required
              >
                <option value="">Selectează tipul de pat</option>
                <option value="Single">Single</option>
                <option value="Twin">Twin (2 paturi single)</option>
                <option value="Double">Double</option>
                <option value="Queen">Queen</option>
                <option value="King">King</option>
                <option value="Super King">Super King</option>
              </select>
            </div>
          </div>

          <div className="form-group full">
            <label>Descriere</label>
            <textarea
              name="description"
              placeholder="Descrierea camerei..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* AMENITIES */}
          <div className="form-group full">
            <label>Amenități</label>
            <div className="amenities-grid">
              {AMENITIES.map(a => (
                <label key={a} className="amenity-item">
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          {/* IMAGES */}
          <div className="form-group full">
            <label>Imagini cameră (maxim 10)</label>

            <label className="image-dropzone">
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImages}
              />
              <p>📸 Încarcă imagini</p>
              <small>PNG, JPG, max 5MB fiecare · Max 10 imagini</small>
            </label>

            {previews.length > 0 && (
              <div className="images-preview-grid">
                {previews.map((preview, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={preview} alt={`preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(index)}
                    >
                      ✕
                    </button>
                    {index === 0 && <span className="primary-badge">Principală</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="add-btn">➕ Adaugă temă</button>
        </form>
      </div>

      {/* LIST THEMES */}
      <div className="themes-list">
        <h3>Lista teme ({themes.length})</h3>

        <div className="themes-grid">
          {themes.map(t => (
            <div key={t.RoomThemeId} className="theme-card">
              {t.images && t.images.length > 0 ? (
                <>
                  <img
                    src={`http://localhost:9001${t.images[0]}`}
                    alt={t.name}
                    className="theme-image"
                  />
                  {t.images.length > 1 && (
                    <div className="image-count-badge">
                      📸 {t.images.length} imagini
                    </div>
                  )}
                </>
              ) : t.image ? (
                <img
                  src={`http://localhost:9001${t.image}`}
                  alt={t.name}
                  className="theme-image"
                />
              ) : null}

              <div className="theme-content">
                <h3>{t.name}</h3>
                <p>{t.city} • {t.theme}</p>
                <p>{t.description}</p>

                <div className="theme-footer">
                  <strong>{t.basePrice} RON / noapte</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
