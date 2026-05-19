import React, { useEffect, useState, useMemo, useRef } from "react";
import { ReactComponent as FilterIcon } from '../../../assets/icons/filter.svg';
import { ReactComponent as SortIcon } from '../../../assets/icons/sort.svg';
import { API_BASE_URL } from "../../../config/runtimeUrls";
import defaultProfilePicture from "../../../assets/profilePicture.jpg";
import "./AdminBookings.css";
import "../rewards/AdminRewards.css";


const PAGE_SIZE = 12;

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
    const [activeBookingsList, setActiveBookingsList] = useState([]);
    const [totalCashReceived, setTotalCashReceived] = useState(0);
    const [bookingStats, setBookingStats] = useState({
      totalBookings: 0,
      activeStays: 0,
      projectedRevenue: 0,
      cashReceived: 0
    });
      // Close sort dropdown on outside click
      useEffect(() => {
        function handleClickOutside(event) {
          if (sortRef.current && !sortRef.current.contains(event.target)) {
            setSortDropdownOpen(false);
          }
        }
        if (sortDropdownOpen) {
          document.addEventListener('mousedown', handleClickOutside);
        } else {
          document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [sortDropdownOpen]);
    // Close dropdown on outside click
    useEffect(() => {
      function handleClickOutside(event) {
        if (filterRef.current && !filterRef.current.contains(event.target)) {
          setFilterDropdownOpen(false);
        }
      }
      if (filterDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      } else {
        document.removeEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [filterDropdownOpen]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

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

  // Fetch bookings (new API: { allBookings, activeBookings })
  const fetchBookings = () => {
    setLoading(true);
    setError("");
    fetch("/api/booking/admin/bookings")
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && data.allBookings && data.activeBookings) {
          setBookings(data.allBookings);
          setActiveBookingsList(data.activeBookings);
          setTotalCashReceived(data.totalCashReceived || 0);
          setBookingStats(data.stats || {
            totalBookings: data.allBookings.length,
            activeStays: data.activeBookings.length,
            projectedRevenue: 0,
            cashReceived: data.totalCashReceived || 0
          });
          console.log('[DEBUG] totalCashReceived from backend:', data.totalCashReceived);
        } else if (Array.isArray(data)) {
          setBookings(data);
          setActiveBookingsList([]);
            setTotalCashReceived(0);
            setBookingStats({
              totalBookings: data.length,
              activeStays: 0,
              projectedRevenue: 0,
              cashReceived: 0
            });
        } else {
          setBookings([]);
          setActiveBookingsList([]);
            setTotalCashReceived(0);
            setBookingStats({
              totalBookings: 0,
              activeStays: 0,
              projectedRevenue: 0,
              cashReceived: 0
            });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading bookings:", err);
        setError("Error loading bookings");
        setBookings([]);
        setActiveBookingsList([]);
        setBookingStats({
          totalBookings: 0,
          activeStays: 0,
          projectedRevenue: 0,
          cashReceived: 0
        });
        setLoading(false);
      });
  };

  // Load on mount + auto-refresh every 30 seconds
  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Store both lists from backend (already declared above, remove duplicate)

  // Statistics
  const totalBookings = bookingStats.totalBookings || bookings.length;
  const activeBookings = bookingStats.activeStays || activeBookingsList.length;
  const totalRevenue = bookingStats.projectedRevenue || 0;
  const cashReceived = bookingStats.cashReceived ?? totalCashReceived;

  // Filtering and sorting
  const filtered = useMemo(() => {
    let f = bookings;
    if (search) {
      f = f.filter(b =>
        b.guestName?.toLowerCase().includes(search.toLowerCase()) ||
        b.roomTheme?.toLowerCase().includes(search.toLowerCase()) ||
        b.bookingId?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'All') {
      if (['Active', 'Completed', 'Cancelled'].includes(statusFilter)) {
        f = f.filter(b => b.status?.toLowerCase() === statusFilter.toLowerCase());
      } else if (statusFilter === 'Recent') {
        f = [...f].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (statusFilter === 'Oldest') {
        f = [...f].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
    }
    return f;
  }, [search, statusFilter, bookings]);

  // Pagination
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);



  const getPaymentStatusBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'full_payment':
        return { bg: '#d1fae5', color: '#065f46', text: 'Fully Paid' };
      case 'deposit_paid':
        return { bg: '#fef3c7', color: '#92400e', text: 'Deposit Paid' };
      case 'partial_payment':
        return { bg: '#fed7aa', color: '#92400e', text: 'Partial' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', text: 'Pending' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: '#dbeafe', color: '#1e40af' };
      case 'completed':
        return { bg: '#d1fae5', color: '#065f46' };
      case 'cancelled':
        return { bg: '#fecaca', color: '#7f1d1d' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `EUR ${Number.isFinite(amount) ? amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : "0.00"}`;
  };

  const formatDate = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const closeBookingDetails = () => setSelectedBooking(null);
  const getPaymentProgress = (booking) => {
    const total = Number(booking?.totalPrice || 0);
    if (!total) return 0;
    return Math.min(100, (Number(booking?.totalPaid || 0) / total) * 100);
  };

  const getPrimaryActionLabel = (booking) => {
    const status = String(booking?.status || "").toLowerCase();
    if (status === "active") return "In-house guest";
    if (status === "completed") return "Stay completed";
    if (status === "cancelled") return "Reservation cancelled";
    return "Upcoming stay";
  };

  const getGuestAvatar = (booking) => {
    const avatar = booking?.guestAvatar;
    if (!avatar || String(avatar).includes("/assets/profilePicture.jpg")) {
      return defaultProfilePicture;
    }
    return avatar;
  };

  return (
    <div className="admin-rewards-container">
      {/* HERO SECTION */}
      <div className="rewards-hero">
        <h1>Booking Architecture</h1>
        <p>Reservations Curation & Strategy</p>
      </div>

      {/* STATS SECTION */}
      <div className="booking-stats-section">
        <div className="booking-stat-card">
          <div className="booking-stat-label">Total Bookings</div>
          <div className="booking-stat-value">{totalBookings.toLocaleString()}</div>
          <div className="booking-stat-trend">Overall count</div>
        </div>

        <div className="booking-stat-card">
          <div className="booking-stat-label">Active Stays</div>
          <div className="booking-stat-value">{activeBookings}</div>
          <div className="booking-stat-trend">(status: active)</div>
        </div>

          <div className="booking-stat-card">
            <div className="booking-stat-label">Projected Revenue</div>
            <div className="booking-stat-value">EUR {(totalRevenue / 1000).toFixed(1)}k</div>
            <div className="booking-stat-trend">Total value</div>
          </div>

          <div className="booking-stat-card">
            <div className="booking-stat-label">Cash Received</div>
            <div className="booking-stat-value">EUR {(cashReceived / 1000).toFixed(1)}k</div>
            <div className="booking-stat-trend">Collected</div>
          </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="existing-inventory">
        <div className="inventory-header">
          <h2>Current Portfolio</h2>
          <p>Managed Assets: In-Rotation Total</p>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="inventory-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Filter bookings..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
          </div>
          <div className="booking-icon-controls">
            <div style={{ position: 'relative', display: 'inline-block' }} ref={filterRef}>
              <button
                className="icon-btn"
                onClick={() => setFilterDropdownOpen(v => !v)}
                type="button"
                title="Filter"
                aria-haspopup="listbox"
                aria-expanded={filterDropdownOpen}
              >
                <FilterIcon style={{ width: 20, height: 20, marginRight: 4, verticalAlign: 'middle' }} />
                <span style={{ fontWeight: statusFilter !== 'All' ? 600 : 400, color: '#444' }}>Filter</span>
              </button>
              {filterDropdownOpen && (
                <ul className="filter-dropdown" style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  minWidth: 120,
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                  zIndex: 10,
                  padding: 0,
                  margin: 0,
                  listStyle: 'none',
                  fontSize: 15
                }}>
                  {['All', 'Active', 'Completed', 'Cancelled'].map(opt => (
                    <li key={opt}>
                      <button
                        className="dropdown-item"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          background: statusFilter === opt ? '#f3f4f6' : 'transparent',
                          border: 'none',
                          fontWeight: statusFilter === opt ? 600 : 400,
                          color: '#222',
                          cursor: 'pointer',
                          borderRadius: 6
                        }}
                        onClick={() => {
                          setStatusFilter(opt);
                          setPage(1);
                          setFilterDropdownOpen(false);
                        }}
                        type="button"
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }} ref={sortRef}>
              <button
                className="icon-btn"
                onClick={() => setSortDropdownOpen(v => !v)}
                type="button"
                title="Sort"
                aria-haspopup="listbox"
                aria-expanded={sortDropdownOpen}
              >
                <SortIcon style={{ width: 20, height: 20, marginRight: 4, verticalAlign: 'middle' }} />
                <span style={{ fontWeight: ['Recent', 'Oldest'].includes(statusFilter) ? 600 : 400, color: '#444' }}>Sort</span>
              </button>
              {sortDropdownOpen && (
                <ul className="filter-dropdown" style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  minWidth: 120,
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                  zIndex: 10,
                  padding: 0,
                  margin: 0,
                  listStyle: 'none',
                  fontSize: 15
                }}>
                  {['Recent', 'Oldest'].map(opt => (
                    <li key={opt}>
                      <button
                        className="dropdown-item"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          background: statusFilter === opt ? '#f3f4f6' : 'transparent',
                          border: 'none',
                          fontWeight: statusFilter === opt ? 600 : 400,
                          color: '#222',
                          cursor: 'pointer',
                          borderRadius: 6
                        }}
                        onClick={() => {
                          setStatusFilter(opt);
                          setPage(1);
                          setSortDropdownOpen(false);
                        }}
                        type="button"
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* BOOKINGS GRID */}
        {loading ? (
          <div className="loading-state">Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No bookings found matching your criteria</div>
        ) : (
          <>
            <div className="rewards-grid">
              {paginated.map(b => {
                const statusBadge = getStatusBadge(b.status);

                return (
                  <div key={b.bookingId} className="booking-portfolio-card">
                    {/* IMAGE WITH STATUS BADGE */}
                    <div className="booking-portfolio-image">
                      {b.roomImage ? (
                        <img 
                          src={b.roomImage}
                          alt={b.roomTheme}
                          className="booking-portfolio-img"
                        />
                      ) : (
                        <div className="booking-portfolio-img booking-portfolio-img--empty" style={{background:'#f3f4f6',height:180,display:'flex',alignItems:'center',justifyContent:'center',color:'#bbb',fontSize:22}}>
                          No image
                        </div>
                      )}
                      <span className="booking-portfolio-badge" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                        {b.status?.toUpperCase()}
                      </span>
                    </div>

                    {/* CONTENT */}
                    <div className="booking-portfolio-content">
                      <h4 className="booking-portfolio-guest">{b.guestName}</h4>
                      <p className="booking-portfolio-theme">{b.roomTheme}</p>
                      <div className="booking-portfolio-meta"><span>Stay</span><strong>{b.dates}</strong></div>

                      {/* PRICING INFO */}
                      <div className="booking-portfolio-pricing">
                        <div className="booking-price-row">
                          <span className="booking-price-label">Total:</span>
                          <span className="booking-price-value">EUR {parseFloat(b.totalPrice).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                        <div className="booking-price-row">
                          <span className="booking-price-label">Received:</span>
                          <span className="booking-price-value">EUR {(b.totalPaid || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                      </div>

                      {/* PAYMENT BADGE */}
                      {(() => {
                        const paymentBadge = getPaymentStatusBadge(b.paymentStatus);
                        return (
                          <span className="booking-payment-badge" style={{ background: paymentBadge.bg, color: paymentBadge.color }}>
                            {paymentBadge.text}
                          </span>
                        );
                      })()}

                      {/* VIEW DETAILS LINK */}
                      <div className="booking-portfolio-action">
                        <button
                          type="button"
                          className="booking-view-details"
                          onClick={() => setSelectedBooking(b)}
                        >
                          VIEW DETAILS
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION */}
            {pageCount > 1 && (
              <div className="booking-pagination">
                <span className="pagination-info">
                  Showing {filtered.length === 0 ? 0 : ((page-1)*PAGE_SIZE+1)} to {Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  
                  {Array.from({length: pageCount}, (_, i) => i+1).slice(Math.max(0, page-2), Math.min(pageCount, page+2)).map(p => (
                    <button
                      key={p}
                      className={`pagination-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  
                  <button
                    className="pagination-btn"
                    disabled={page === pageCount}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SUCCESS TOAST */}
      {success && (
        <div className="toast toast-success">
          <div className="toast-icon">OK</div>
          <div className="toast-message">{success}</div>
        </div>
      )}

      {/* ERROR TOAST */}
      {error && (
        <div className="toast toast-error">
          <div className="toast-icon">!</div>
          <div className="toast-message">{error}</div>
        </div>
      )}

      {selectedBooking && (
        <div className="admin-booking-modal-backdrop" role="presentation" onClick={closeBookingDetails}>
          <section
            className="admin-booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-booking-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-booking-modal-header">
              <div>
                <h2 id="admin-booking-modal-title">Booking {selectedBooking.bookingId}</h2>
                <span className={`admin-booking-status-pill status-${String(selectedBooking.status || "pending").toLowerCase()}`}>
                  {selectedBooking.status || "Pending"}
                </span>
              </div>
              <div className="admin-booking-header-actions">
                <button
                  type="button"
                  className="admin-booking-gold-btn"
                  onClick={() => window.open(`${API_BASE_URL}/api/invoices/${selectedBooking.reservationId}/download-pdf`, "_blank")}
                >
                  View Invoice
                </button>
                <button type="button" className="admin-booking-icon-close" onClick={closeBookingDetails} aria-label="Close booking details">
                  X
                </button>
              </div>
            </header>

            <div className="admin-booking-modal-body admin-booking-operator-layout">
              <aside className="admin-booking-guest-panel">
                <section>
                  <p className="admin-booking-eyebrow">Guest Information</p>
                  <div className="admin-booking-guest-card">
                    <img
                      src={getGuestAvatar(selectedBooking)}
                      alt={selectedBooking.guestName}
                      onError={(event) => { event.currentTarget.src = defaultProfilePicture; }}
                    />
                    <div>
                      <strong>{selectedBooking.guestName}</strong>
                      <span>{selectedBooking.guestTier || "Cityscape Member"}</span>
                    </div>
                  </div>
                  <div className="admin-booking-contact-list">
                    <span>{selectedBooking.guestEmail || "No email recorded"}</span>
                    <span>{selectedBooking.city || "Cityscape"} guest</span>
                    <span>{selectedBooking.bookingMethod || "online"} booking</span>
                  </div>
                </section>

                <section>
                  <p className="admin-booking-eyebrow">Reservation Overview</p>
                  <div className="admin-booking-overview-grid">
                    <div><span>Check-in</span><strong>{formatDate(selectedBooking.checkin)}</strong></div>
                    <div><span>Check-out</span><strong>{formatDate(selectedBooking.checkout)}</strong></div>
                    <div><span>Duration</span><strong>{selectedBooking.nights || 0} Nights</strong></div>
                    <div><span>Occupancy</span><strong>{selectedBooking.guests || 1} {(selectedBooking.guests || 1) === 1 ? "Guest" : "Guests"}</strong></div>
                  </div>
                  <small className="admin-booking-created">Created on {formatDate(selectedBooking.createdAt)}</small>
                </section>

                <section>
                  <p className="admin-booking-eyebrow">Timeline Activity</p>
                  <div className="admin-booking-timeline">
                    <div><span /> <p><strong>Booking Created</strong><small>{formatDate(selectedBooking.createdAt)}</small></p></div>
                    {selectedBooking.payments?.length > 0 && (
                      <div><span /> <p><strong>Payment Received</strong><small>{formatDate(selectedBooking.payments[0].paymentDate)}</small></p></div>
                    )}
                    {(selectedBooking.services?.length > 0 || selectedBooking.rewards?.length > 0) && (
                      <div><span /> <p><strong>Stay Add-ons Updated</strong><small>{(selectedBooking.services?.length || 0) + (selectedBooking.rewards?.length || 0)} items attached</small></p></div>
                    )}
                  </div>
                </section>
              </aside>

              <main className="admin-booking-detail-panel">
                <section>
                  <p className="admin-booking-eyebrow">Room Details</p>
                  <div className="admin-booking-room-visual">
                    {selectedBooking.roomImage ? (
                      <img src={selectedBooking.roomImage} alt={selectedBooking.roomTheme} />
                    ) : (
                      <div className="admin-booking-modal-image-empty">No image</div>
                    )}
                    <div>
                      <span>{selectedBooking.theme || selectedBooking.city || "Cityscape Room"}</span>
                      <strong>{selectedBooking.roomTheme || selectedBooking.roomName}</strong>
                    </div>
                  </div>
                  <div className="admin-booking-room-tags">
                    <span>{selectedBooking.city || "Cityscape"}</span>
                    <span>{selectedBooking.roomName || "Reserved room"}</span>
                  </div>
                </section>

                <section>
                  <div className="admin-booking-section-line">
                    <p className="admin-booking-eyebrow">Extra Services</p>
                    <span>{(selectedBooking.services?.length || 0) + (selectedBooking.rewards?.length || 0)} items</span>
                  </div>

                  {selectedBooking.services?.length || selectedBooking.rewards?.length ? (
                    <div className="admin-booking-extra-grid">
                      {selectedBooking.services?.map((service) => (
                        <article key={`service-${service.id}`}>
                          <span className="admin-booking-mini-icon">S</span>
                          <strong>{service.name}</strong>
                          <small>{service.description || service.category || "Hotel service"}</small>
                          <em>{formatCurrency(service.total)}</em>
                        </article>
                      ))}
                      {selectedBooking.rewards?.map((reward) => (
                        <article key={`reward-${reward.id}`}>
                          <span className="admin-booking-mini-icon">R</span>
                          <strong>{reward.title}</strong>
                          <small>{reward.description || reward.category || "Reward applied"}</small>
                          <em>{Number(reward.points || 0).toLocaleString()} pts</em>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-booking-empty-detail">No services or rewards attached to this reservation yet.</div>
                  )}
                </section>

                <section>
                  <p className="admin-booking-eyebrow">Financial Summary</p>
                  <div className="admin-booking-financial-grid">
                    <div><span>Total</span><strong>{formatCurrency(selectedBooking.totalPrice)}</strong></div>
                    <div><span>Paid</span><strong>{formatCurrency(selectedBooking.totalPaid)}</strong></div>
                    <div><span>Balance</span><strong>{formatCurrency(selectedBooking.remainingDue)}</strong></div>
                  </div>
                  <div className="admin-booking-progress" aria-label="Payment progress">
                    <span style={{ width: `${getPaymentProgress(selectedBooking)}%` }} />
                  </div>
                  <div className="admin-booking-payment-note">
                    <span>{selectedBooking.invoiceId ? `Invoice INV-${String(selectedBooking.invoiceId).padStart(4, "0")}` : "No invoice issued"}</span>
                    <button
                      type="button"
                      onClick={() => window.open(`${API_BASE_URL}/api/invoices/${selectedBooking.reservationId}/download-pdf`, "_blank")}
                    >
                      View invoice
                    </button>
                  </div>
                </section>
              </main>
            </div>

            <footer className="admin-booking-modal-footer">
              <button type="button" className="admin-booking-danger-action" onClick={closeBookingDetails}>Close Details</button>
              <div>
                <button type="button" className="admin-booking-primary-action" disabled>
                  {getPrimaryActionLabel(selectedBooking)}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
