

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardData } from "../../services/dashboardService";
import FeedbackForm from "../Feedback/FeedbackForm";

export default function PastReservations() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 4;
  const [showFeedback, setShowFeedback] = useState(null); // reservation object
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getDashboardData();
        setReservations(data.allReservations || []);
      } catch (err) {
        setReservations([]);
      }
    }
    fetchData();
  }, []);


  return (
    <div style={{ background: '#f6f7f8', minHeight: '100vh', padding: 0 }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <nav style={{ color: '#617589', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              <span>Account</span> <span style={{ margin: '0 4px' }}>{'>'}</span> <span style={{ color: '#c6a969' }}>Past Stays</span>
            </nav>
            <h1 style={{ color: '#111418', fontSize: 36, fontWeight: 900, margin: 0 }}>Reservations</h1>
            <p style={{ color: '#617589', fontSize: 16, margin: 0 }}>You have {reservations.length} stays.</p>
          </div>
          <button
            style={{ borderRadius: 12, height: 48, padding: '0 32px', background: '#1f2937', color: '#fff', fontWeight: 700, fontSize: 15, boxShadow: '0 2px 8px rgba(31, 41, 55, 0.15)', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/booking')}
          >
            Book New Stay
          </button>
        </div>
        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 20, boxShadow: '0 1px 4px rgba(31, 41, 55, 0.05)', border: '1px solid rgba(31, 41, 55, 0.08)', padding: 16, marginBottom: 32 }}>
          <input
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: '#111418', padding: '0 8px' }}
            placeholder="Search by city or room theme..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button style={{ background: '#f3f1ed', color: '#c6a969', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600, fontSize: 15, height: 44 }}>All Time</button>
          <button style={{ background: '#f3f1ed', color: '#c6a969', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600, fontSize: 15, height: 44 }}>Filters</button>
        </div>
        {/* Reservations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(() => {
            // Filtrăm doar rezervările cu status 'completed' (finalizate)
            const filtered = reservations.filter(res => {
              if (res.status !== 'completed') return false;
              const city = res.city?.toLowerCase() || "";
              const theme = res.room?.toLowerCase() || "";
              return (
                city.includes(search.toLowerCase()) ||
                theme.includes(search.toLowerCase())
              );
            });
            const paged = filtered.slice((page - 1) * perPage, page * perPage);
            // Helper pentru formatat data
            function formatDate(dateStr) {
              if (!dateStr) return '-';
              const d = new Date(dateStr);
              return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            return paged.map((res) => {
              // Fallback pentru datele de checkin/checkout
              const checkinStr = res.requestedCheckin || res.checkIn || res.checkin || res.startDate;
              const checkoutStr = res.requestedCheckout || res.checkOut || res.checkout || res.endDate;
              // Etichetă status: doar 'Completed' pentru rezervările filtrate
              let statusLabel = 'Completed', statusColor = '#047857', statusBg = '#d1fae5';

              // Fallback pentru room/city/totalAmount
              const room = res.room || res.roomName || res.RoomName || res.theme || '-';
              const city = res.city || res.City || res.location || '-';
              const totalAmount = res.totalAmount || res.amount || res.price || res.total || '-';

              // Imagine cameră - use the image field directly from reservation
              let roomImg = res.image || null;

              return (
                <div key={res.reservationId} style={{ display: 'flex', flexDirection: 'row', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #0001', border: '1px solid #f1f1f1', padding: 0, alignItems: 'center', gap: 0, marginBottom: 24, overflow: 'hidden' }}>
                  {/* Imagine cameră sau placeholder */}
                  <div style={{ width: 140, height: 110, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {roomImg ? (
                      <img src={roomImg} alt={room} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#bdbdbd' }}>bed</span>
                    )}
                  </div>
                  {/* Detalii rezervare */}
                  <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
                      <span style={{ background: statusBg, color: statusColor, fontWeight: 700, fontSize: 13, borderRadius: 8, padding: '3px 14px', textTransform: 'uppercase', letterSpacing: 1 }}>{statusLabel}</span>
                      <span style={{ color: '#bdbdbd', fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>RESERVATION #{res.reservationId}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ color: '#111418', fontSize: 22, fontWeight: 800, margin: 0 }}>{room}</h3>
                      <span style={{ color: '#8b8b8b', fontSize: 16 }}>{city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, color: '#617589', fontSize: 15, marginTop: 2 }}>
                      <span><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>calendar_today</span> {formatDate(checkinStr)} - {formatDate(checkoutStr)}</span>
                      <span><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>payments</span> {totalAmount} RON</span>
                    </div>
                  </div>
                  {/* Butoane */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 160, alignItems: 'flex-end', padding: '0 32px' }}>
                    <button
                      style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 16, marginBottom: 4, cursor: 'pointer', boxShadow: '0 2px 8px rgba(31, 41, 55, 0.15)' }}
                      onClick={() => navigate(`/feedback/${res.ReservationId || res.reservationId}`)}
                    >
                      Review Stay
                    </button>
                    <button
                      style={{ background: '#f6f7f8', color: '#111418', border: '1px solid #ddd', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
                      onClick={() => navigate(`/reservation/${res.ReservationId || res.reservationId}`)}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
        {/* Pagination */}
        {/* Feedback modal */}
        {showFeedback && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 700 }}>
              <button onClick={() => setShowFeedback(null)} style={{ position: 'absolute', top: 12, right: 12, background: '#fff', border: '1px solid #eee', borderRadius: 20, width: 36, height: 36, fontSize: 22, cursor: 'pointer', zIndex: 10 }}>×</button>
              <FeedbackForm reservation={showFeedback.reservation} status={showFeedback.status} />
            </div>
          </div>
        )}
        {/* Pagination reală */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, margin: '32px 0 0 0' }}>
          <button
            style={{ background: '#fff', border: '1px solid rgba(31, 41, 55, 0.1)', color: '#617589', borderRadius: 8, padding: '6px 16px', fontWeight: 600, fontSize: 15, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Previous</button>
          {Array.from({ length: Math.ceil(reservations.filter(res => {
            const city = res.city?.toLowerCase() || "";
            const theme = res.room?.toLowerCase() || "";
            return (
              city.includes(search.toLowerCase()) ||
              theme.includes(search.toLowerCase())
            );
          }).length / perPage) }, (_, i) => (
            <button
              key={i+1}
              style={{ background: page === i+1 ? '#1f2937' : '#fff', color: page === i+1 ? '#fff' : '#111418', border: page === i+1 ? 'none' : '1px solid rgba(31, 41, 55, 0.1)', borderRadius: 8, width: 36, height: 36, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              onClick={() => setPage(i+1)}
            >{i+1}</button>
          ))}
          <button
            style={{ background: '#fff', border: '1px solid rgba(31, 41, 55, 0.1)', color: '#111418', borderRadius: 8, padding: '6px 16px', fontWeight: 600, fontSize: 15, cursor: page === Math.ceil(reservations.filter(res => {
              const city = res.city?.toLowerCase() || "";
              const theme = res.room?.toLowerCase() || "";
              return (
                city.includes(search.toLowerCase()) ||
                theme.includes(search.toLowerCase())
              );
            }).length / perPage) ? 'not-allowed' : 'pointer', opacity: page === Math.ceil(reservations.filter(res => {
              const city = res.city?.toLowerCase() || "";
              const theme = res.room?.toLowerCase() || "";
              return (
                city.includes(search.toLowerCase()) ||
                theme.includes(search.toLowerCase())
              );
            }).length / perPage) ? 0.5 : 1 }}
            onClick={() => setPage(p => Math.min(Math.ceil(reservations.filter(res => {
              const city = res.city?.toLowerCase() || "";
              const theme = res.room?.toLowerCase() || "";
              return (
                city.includes(search.toLowerCase()) ||
                theme.includes(search.toLowerCase())
              );
            }).length / perPage), p + 1))}
            disabled={page === Math.ceil(reservations.filter(res => {
              const city = res.city?.toLowerCase() || "";
              const theme = res.room?.toLowerCase() || "";
              return (
                city.includes(search.toLowerCase()) ||
                theme.includes(search.toLowerCase())
              );
            }).length / perPage)}
          >Next</button>
        </div>
        {/* Footer Stats removed */}
      </div>
    </div>
  );
}
