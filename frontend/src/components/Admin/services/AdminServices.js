import { useEffect, useState } from "react";
import {
  getServices,
  createService,
  deleteService
} from "../../../services/serviceService";
import { uploadImage } from "../../../services/roomThemeService";
import "./AdminServices.css";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "Wellness & Spa",
    price: "",
    description: "",
    status: "activ",
    bookableOnline: true,
    availableForExternalGuests: false
  });

  async function loadServices() {
    const data = await getServices();
    setServices(data);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name || !form.price) {
      alert("Completează numele și prețul");
      return;
    }

    try {
      let imageUrl = null;
      
      // Upload imagine dacă există
      if (image) {
        const uploadResult = await uploadImage(image);
        imageUrl = uploadResult.imageUrl;
      }

      await createService({
        ...form,
        price: Number(form.price),
        image: imageUrl
      });

      setForm({
        name: "",
        category: "Wellness & Spa",
        price: "",
        description: "",
        status: "activ",
        bookableOnline: true,
        availableForExternalGuests: false
      });
      setImage(null);
      setPreview(null);

      loadServices();
      alert("Serviciu adăugat cu succes!");
    } catch (err) {
      console.error(err);
      alert("Eroare la adăugarea serviciului");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Ștergi serviciul?")) return;
    await deleteService(id);
    loadServices();
  }

  return (
    <div className="services-page">
      <div className="service-card">
        <h3>Adaugă serviciu nou</h3>

        <form onSubmit={handleSubmit} className="service-form">
          <input
            name="name"
            placeholder="Nume serviciu"
            value={form.name}
            onChange={handleChange}
            required
          />

          <select name="category" value={form.category} onChange={handleChange}>
            <option>Wellness & Spa</option>
            <option>Restaurant</option>
            <option>Transport</option>
            <option>Experiențe</option>
          </select>

          <input
            type="number"
            name="price"
            placeholder="Preț"
            value={form.price}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Descriere"
            value={form.description}
            onChange={handleChange}
          />

          <div className="image-upload-section">
            <label className="image-upload-label">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleImage}
              />
              <span>📸 Adaugă imagine (opțional)</span>
            </label>

            {preview && (
              <div className="image-preview-small">
                <img src={preview} alt="preview" />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={() => {
                    setImage(null);
                    setPreview(null);
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <label>
            <input
              type="checkbox"
              name="bookableOnline"
              checked={form.bookableOnline}
              onChange={handleChange}
            />
            Rezervabil online
          </label>

          <label>
            <input
              type="checkbox"
              name="availableForExternalGuests"
              checked={form.availableForExternalGuests}
              onChange={handleChange}
            />
            Disponibil pentru exterior
          </label>

          <button className="add-btn">➕ Adaugă</button>
        </form>
      </div>

      <div className="service-list-card">
        <h3>Lista servicii ({services.length})</h3>

        <table>
          <thead>
            <tr>
              <th>Imagine</th>
              <th>Serviciu</th>
              <th>Categorie</th>
              <th>Preț</th>
              <th>Status</th>
              <th>Online</th>
              <th>Extern</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.ServiceId}>
                <td>
                  {s.image ? (
                    <img
                      src={`http://localhost:9001${s.image}`}
                      alt={s.name}
                      className="service-table-image"
                    />
                  ) : (
                    <div className="no-image">📷</div>
                  )}
                </td>
                <td>
                  <strong>{s.name}</strong>
                  <div className="muted">{s.description}</div>
                </td>
                <td>{s.category}</td>
                <td>{s.price} RON</td>
                <td>
                  <span className={`status-badge ${s.status}`}>{s.status}</span>
                </td>
                <td>{s.bookableOnline ? "✔️" : "—"}</td>
                <td>{s.availableForExternalGuests ? "✔️" : "—"}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDelete(s.ServiceId)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
