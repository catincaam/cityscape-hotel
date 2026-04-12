import { useEffect, useState } from "react";
import {
  getServices,
  createService,
  deleteService
} from "../../../services/serviceService";
import { uploadImage } from "../../../services/roomThemeService";
import "./AdminServices.css";
import "../rewards/AdminRewards.css";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Wellness & Spa",
    price: "",
    pricingType: "per_person",
    description: "",
    status: "active",
    bookableOnline: true,
    availableForExternalGuests: false
  });

  /* ======================
     LOAD SERVICES
  ====================== */
  async function loadServices() {
    try {
      const data = await getServices();
      setServices(data || []);
    } catch (err) {
      console.error("Load services error:", err);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  /* ======================
     FORM HANDLERS
  ====================== */
  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      let imagePath = "";

      if (image) {
        const res = await uploadImage(image);
        imagePath = res.imageUrl || res;
      }

      await createService({
        ...form,
        image: imagePath
      });

      setForm({
        name: "",
        category: "Wellness & Spa",
        price: "",
        pricingType: "per_person",
        description: "",
        status: "active",
        bookableOnline: true,
        availableForExternalGuests: false
      });

      setImage(null);
      setPreview(null);

      loadServices();
    } catch (err) {
      alert("Error creating service");
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this service?")) return;

    try {
      await deleteService(id);
      loadServices();
    } catch {
      alert("Delete error");
    }
  }

  /* ======================
     FILTER
  ====================== */
  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  /* ======================
     JSX
  ====================== */
  return (
    <>
      {/* ADD SERVICE */}
      <div className="service-form-container">
        <div className="service-form-card">
          <h3>Add New Service</h3>

          <form onSubmit={handleSubmit}>
            {/* 🧾 BASIC INFO CARD */}
            <div className="form-section">
              <div className="section-title">Service Details</div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Service Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g., Spa Massage"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option>Wellness & Spa</option>
                    <option>Restaurant</option>
                    <option>Transport</option>
                    <option>Experiences</option>
                    <option>Housekeeping</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Price (EUR)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="e.g., 85"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pricing Type</label>
                  <select
                    name="pricingType"
                    value={form.pricingType}
                    onChange={handleChange}
                  >
                    <option value="per_person">Per Person</option>
                    <option value="per_room">Per Room</option>
                    <option value="per_hour">Per Hour</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 📝 DESCRIPTION CARD */}
            <div className="form-section">
              <div className="section-title">Description</div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Tell more about this service..."
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* ⚙️ AVAILABILITY CARD */}
            <div className="form-section">
              <div className="section-title">Availability</div>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="bookableOnline"
                    checked={form.bookableOnline}
                    onChange={handleChange}
                  />
                  <span>Bookable Online</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="availableForExternalGuests"
                    checked={form.availableForExternalGuests}
                    onChange={handleChange}
                  />
                  <span>External Guests Allowed</span>
                </label>
              </div>
            </div>

            {/* 🖼 IMAGE CARD */}
            <div className="form-section">
              <div className="section-title">Service Image</div>
              <label className="image-upload-box">
                <input type="file" accept="image/*" hidden onChange={handleImage} />
                <div className="upload-content">
                  <p>{preview ? 'Change image' : 'Upload image'}</p>
                  <small>PNG, JPG, max 5MB</small>
                </div>
              </label>
              {preview && (
                <div className="preview-container">
                  <img src={preview} alt="preview" />
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="btn-submit">Add Service</button>
          </form>
        </div>
      </div>

      {/* SERVICE LIST */}
      <div className="admin-rewards-list-card">
        <h3>Service List ({services.length})</h3>

        <div className="admin-rewards-list-header">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search service..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Service</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Online</th>
              <th>External</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filteredServices.map(s => (
              <tr key={s.ServiceId}>
                <td>
                  {s.image ? (
                    <img
                      src={`http://localhost:9001${s.image}`}
                      alt={s.name}
                      className="reward-table-image"
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
                <td>{s.price} EUR</td>

                <td>
                  <span className={`status-badge ${s.status}`}>
                    {s.status}
                  </span>
                </td>

                <td>{s.bookableOnline ? "✔️" : "—"}</td>
                <td>{s.availableForExternalGuests ? "✔️" : "—"}</td>

                <td className="actions-cell">
                  <button
                    className="delete-action-btn"
                    onClick={() => handleDelete(s.ServiceId)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}