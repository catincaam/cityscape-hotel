import { useEffect, useState, useMemo } from "react";
import {
  getServices,
  createService,
  updateService,
  deleteService
} from "../../../services/serviceService";
import { uploadImage } from "../../../services/roomThemeService";
import "./AdminServices.css";
import "../rewards/AdminRewards.css";

const PRICING_TYPES = [
  { value: "per_person", label: "Per Person" },
  { value: "per_booking", label: "Per Booking" },
];

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "Wellness & Spa",
    price: "",
    priceType: "per_booking",
    description: "",
    status: "active",
    bookableOnline: true,
    availableForExternalGuests: false
  });

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

  // Load services
  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const data = await getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading services:", err);
      setError("Error loading services");
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

    if (!form.name || !form.description || !form.price || !form.category) {
      setError("All fields are required!");
      setLoading(false);
      return;
    }

    try {
      let finalImage = form.image || "";

      // Only upload if there's a new image
      if (images.length > 0) {
        const uploadRes = await uploadImage(images[0]);
        finalImage = uploadRes.imageUrl || uploadRes;
      }

      if (editingId) {
        // UPDATE
        await updateService(editingId, {
          name: form.name,
          category: form.category,
          price: parseFloat(form.price),
          priceType: form.priceType,
          description: form.description,
          status: form.status,
          bookableOnline: form.bookableOnline,
          availableForExternalGuests: form.availableForExternalGuests,
          image: finalImage
        });
        setSuccess("Service updated successfully!");
      } else {
        // CREATE
        if (images.length === 0) {
          setError("At least one image is required!");
          setLoading(false);
          return;
        }

        await createService({
          name: form.name,
          category: form.category,
          price: parseFloat(form.price),
          priceType: form.priceType,
          description: form.description,
          status: form.status,
          bookableOnline: form.bookableOnline,
          availableForExternalGuests: form.availableForExternalGuests,
          image: finalImage
        });
        setSuccess("Service created successfully!");
      }

      // Reset form
      setForm({
        name: "",
        category: "Wellness & Spa",
        price: "",
        priceType: "per_booking",
        description: "",
        status: "active",
        bookableOnline: true,
        availableForExternalGuests: false
      });
      setImages([]);
      setPreviews([]);
      setEditingId(null);

      await fetchServices();
    } catch (err) {
      setError(err.message || "Error during operation!");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(service) {
    setEditingId(service.ServiceId);
    setForm({
      name: service.name,
      category: service.category,
      price: service.price.toString(),
      priceType: service.priceType || "per_booking",
      description: service.description,
      status: service.status,
      bookableOnline: service.bookableOnline,
      availableForExternalGuests: service.availableForExternalGuests,
      image: service.image
    });
    setImages([]);
    setPreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({
      name: "",
      category: "Wellness & Spa",
      price: "",
      priceType: "per_booking",
      description: "",
      status: "active",
      bookableOnline: true,
      availableForExternalGuests: false
    });
    setImages([]);
    setPreviews([]);
  }

  // Compute unique categories from services data
  const uniqueCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Filter services by search and category (case-insensitive)
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === 'All' ||
        (s.category && s.category.toLowerCase() === categoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  function handleDelete(serviceId) {
    const service = services.find(s => s.ServiceId === serviceId);
    setDeleteConfirmTitle(service?.name || "this service");
    setDeleteConfirm(serviceId);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    
    try {
      setServices(services.filter(s => s.ServiceId !== deleteConfirm));
      await deleteService(deleteConfirm);
      setSuccess("Service deleted successfully!");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    } catch (err) {
      await fetchServices();
      setError(err.message || "Error deleting service");
      setDeleteConfirm(null);
      setDeleteConfirmTitle("");
    }
  }

  function cancelDelete() {
    setDeleteConfirm(null);
    setDeleteConfirmTitle("");
  }

  const previewImage = previews.length > 0 ? previews[0] : (form.image ? `http://localhost:9001${form.image}` : null);
  const categoryLabel = uniqueCategories.find(c => c === form.category) || form.category;
  const pricingLabel = PRICING_TYPES.find(p => p.value === form.priceType)?.label || form.priceType;

  return (
    <div className="admin-rewards-container">
      {/* HERO SECTION */}
      <div className="rewards-hero">
        <h1>Manage Services</h1>
        <p>Create and curate premium services for your guests</p>
      </div>

      {/* FORM + PREVIEW SECTION */}
      <div className="rewards-creation-section">
        {/* LEFT: FORM */}
        <div className="rewards-form-wrapper">
          <div className="form-header">
            <h2>{editingId ? "Edit Service" : "Create Service"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="rewards-form">
            {/* SERVICE NAME */}
            <div className="form-field">
              <label>Service Name</label>
              <input
                type="text"
                placeholder="e.g., Spa Massage Treatment"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            {/* CATEGORY & PRICING TYPE */}
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
                </select>
              </div>

              <div className="form-field">
                <label>Pricing Type</label>
                <select
                  value={form.priceType}
                  onChange={e => setForm({ ...form, priceType: e.target.value })}
                  className="form-select"
                >
                  {PRICING_TYPES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PRICE */}
            <div className="form-field">
              <label>Price (EUR)</label>
              <div className="points-input-wrapper">
                <input
                  type="number"
                  placeholder="e.g., 85"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  required
                  className="form-input points-input"
                />
                <span className="points-label">EUR</span>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="form-field">
              <label>Description</label>
              <textarea
                placeholder="Describe the service and its benefits..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
                className="form-textarea"
                rows="4"
              />
            </div>

            {/* IMAGE UPLOAD */}
            <div className="form-field">
              <label>Service Image</label>
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

            {/* STATUS & CHECKBOXES */}
            <div className="form-field">
              <label>Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="form-select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.bookableOnline}
                  onChange={e => setForm({ ...form, bookableOnline: e.target.checked })}
                />
                <span>Bookable Online</span>
              </label>
            </div>

            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.availableForExternalGuests}
                  onChange={e => setForm({ ...form, availableForExternalGuests: e.target.checked })}
                />
                <span>Available for External Guests</span>
              </label>
            </div>

            {/* ERROR MESSAGE */}
            {error && <div className="error-message">{error}</div>}

            {/* BUTTONS */}
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {editingId ? "Update Service" : "Publish Service"}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">
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
                <div className="preview-badge">{form.price} EUR</div>
              </div>

              <div className="preview-content">
                <div className="preview-category">{categoryLabel}</div>
                <h3 className="preview-title">{form.name || "Service Name"}</h3>
                <p className="preview-description">{form.description || "Service description will appear here"}</p>
                
                <div className="preview-meta">
                  <span className="meta-item">
                    <span className="meta-label">Pricing:</span>
                    <span className="meta-value">{pricingLabel}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Bookable Online:</span>
                    <span className="meta-value">{form.bookableOnline ? 'Yes' : 'No'}</span>
                  </span>
                </div>

                <button className="preview-btn" disabled>Reserve Now</button>
              </div>
            </div>
          ) : (
            <div className="preview-empty">
              <div className="empty-icon">🛎️</div>
              <p>Fill in the form and upload an image to see your service preview here</p>
            </div>
          )}
        </div>
      </div>

      {/* EXISTING INVENTORY */}
      <div className="existing-inventory">
        <div className="inventory-header">
          <h2>Existing Services</h2>
          <p>Manage and curate your premium service catalog</p>
        </div>

        {/* SEARCH */}
        <div className="inventory-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search services..."
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

        {/* SERVICES GRID */}
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredServices.length === 0 ? (
          <div className="empty-state">No services yet. Create your first one above!</div>
        ) : (
          <div className="rewards-grid">
            {filteredServices.map(s => (
              <div key={s.ServiceId} className="reward-card">
                <div className="reward-card-image">
                  {s.image ? (
                    <img src={`http://localhost:9001${s.image}`} alt={s.name} />
                  ) : (
                    <div className="no-image">[No Image]</div>
                  )}
                  <div className="reward-card-badge">{s.price} EUR</div>
                </div>

                <div className="reward-card-content">
                  <div className="reward-card-category">{s.category}</div>
                  <h4 className="reward-card-title">{s.name}</h4>
                  <p className="reward-card-desc">{s.description}</p>

                  <div className="reward-card-meta">
                    <span className={`type-badge ${s.priceType}`}>
                      {s.priceType?.toUpperCase()}
                    </span>
                    <span className={`status-badge ${s.status === 'active' ? 'active' : 'inactive'}`}>
                      {s.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="reward-card-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(s)} title="Edit">
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(s.ServiceId)} title="Delete">
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
              <h3>Delete Service?</h3>
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
