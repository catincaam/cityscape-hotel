import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../Dashboard/Navbar';
import '../../feedback.css';

const MAX_COMMENT_LENGTH = 500;

function StarRating({ value, onChange, size = 32, label, className = '' }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className={className}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          role="button"
          style={{
            fontSize: size,
            cursor: 'pointer',
            color: i <= value ? 'var(--primary)' : '#e5e7eb',
            lineHeight: 1,
            fontFamily: 'Georgia, serif'
          }}
          onClick={() => onChange(i)}
        >
          {'\u2605'}
        </span>
      ))}
      {label && <span style={{ marginLeft: 8, fontWeight: 600 }}>{label}</span>}
    </div>
  );
}

const FeedbackPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [overall, setOverall] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [service, setService] = useState(0);
  const [theme, setTheme] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    async function fetchReservation() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/reservations/${reservationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Fallback: if response has .Content, parse it
        let reservationObj = res.data;
        if (reservationObj && reservationObj.Content && typeof reservationObj.Content === 'string') {
          try {
            reservationObj = JSON.parse(reservationObj.Content);
          } catch (e) {}
        }
        setReservation(reservationObj);
      } catch (err) {
        setError('Could not load reservation.');
      } finally {
        setLoading(false);
      }
    }
    fetchReservation();
  }, [reservationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!overall || !cleanliness || !service || !theme) {
      setError('Please rate all categories.');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters in your comment.');
      return;
    }
    // Normalizează statusul: dacă e 'past', tratează ca 'completed'
    let normalizedStatus = reservation && reservation.status ? String(reservation.status).toLowerCase() : '';
    if (normalizedStatus === 'past') normalizedStatus = 'completed';
    if (!reservation || (normalizedStatus && normalizedStatus !== 'completed')) {
      setError('You can only leave a review for completed stays.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const clientId = reservation?.ClientId || reservation?.clientId;
      await axios.post(
        '/api/feedback',
        {
          ReservationId: parseInt(reservationId),
          ClientId: clientId,
          overall,
          cleanliness,
          service,
          theme,
          comment,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit feedback. Please try again later.');
      console.error(err.response?.data || err.message);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ background: 'var(--background-light)', minHeight: '100vh', color: '#111418', fontFamily: 'Plus Jakarta Sans, Manrope, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
        <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Hero Section */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, padding: '0 8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={{ color: '#111418', fontSize: 36, fontWeight: 900, fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>Your experience matters.</h1>
              <p style={{ color: '#617589', fontSize: 18, fontWeight: 400, margin: 0 }}>Tell us about your recent stay at Cityscape Hotel</p>
            </div>
            <button onClick={() => navigate('/dashboard')} style={{ borderRadius: 16, height: 44, padding: '0 32px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15, boxShadow: '0 2px 8px rgba(31, 41, 55, 0.15)', border: 'none', cursor: 'pointer' }}>Back to Dashboard</button>
          </div>
          {/* Main Feedback Form */}
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(31, 41, 55, 0.08)', border: '1px solid rgba(31, 41, 55, 0.06)', padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Overall Rating */}
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>How was your overall stay?</h2>
              <StarRating value={overall} onChange={setOverall} size={40} />
              {overall > 0 && (
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>{['Poor','Fair','Good','Very Good','Excellent'][overall-1]} ({overall}/5)</p>
              )}
            </section>
            <hr style={{ borderColor: 'rgba(31, 41, 55, 0.06)' }} />
            {/* Detailed Metrics Grid */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'var(--background-light)' }}>
                <span style={{ color: 'var(--primary)', fontSize: 28, lineHeight: 1 }}>{'\u2713'}</span>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Cleanliness</h3>
                <StarRating value={cleanliness} onChange={setCleanliness} size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'var(--background-light)' }}>
                <span style={{ color: 'var(--primary)', fontSize: 28, lineHeight: 1 }}>{'\u25c7'}</span>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Service</h3>
                <StarRating value={service} onChange={setService} size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'var(--background-light)' }}>
                <span style={{ color: 'var(--primary)', fontSize: 28, lineHeight: 1 }}>{'\u2302'}</span>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Theme Accuracy</h3>
                <StarRating value={theme} onChange={setTheme} size={24} />
              </div>
            </section>
            {/* Comments Section */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 17, fontWeight: 700 }} htmlFor="feedback-comments">Share your thoughts</label>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#617589' }}>Max {MAX_COMMENT_LENGTH} characters</span>
              </div>
              <textarea
                style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(31, 41, 55, 0.06)', background: 'var(--background-light)', padding: 16, fontSize: 15, resize: 'none', color: '#111418', fontFamily: 'inherit', minHeight: 100 }}
                id="feedback-comments"
                placeholder="What did you love? What could we improve?"
                rows={5}
                maxLength={MAX_COMMENT_LENGTH}
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <p style={{ fontSize: 11, color: '#617589', margin: 0 }}>{comment.length} / {MAX_COMMENT_LENGTH}</p>
              </div>
            </section>
            {/* Submit Action */}
            <section style={{ paddingTop: 16 }}>
              <button type="submit" style={{ width: '100%', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 17, padding: '16px 0', borderRadius: 16, boxShadow: '0 2px 8px rgba(31, 41, 55, 0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Submit Review
                <span style={{ fontSize: 18, lineHeight: 1 }}>{'\u2192'}</span>
              </button>
              {error && <p style={{ textAlign: 'center', fontSize: 13, color: '#e53935', marginTop: 16 }}>{error}</p>}
              {success && <p style={{ textAlign: 'center', fontSize: 13, color: '#43a047', marginTop: 16 }}>Thank you for your feedback!</p>}
            </section>
          </form>
          {/* Featured Image / Brand Asset */}
          <div style={{ position: 'relative', height: 192, width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(31, 41, 55, 0.8), transparent)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 40, color: 'white' }}>
              <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Premium Loyalty</h3>
              <p style={{ fontSize: 15, opacity: 0.9, maxWidth: 256, margin: 0 }}>Get 500 points for every review you submit this month.</p>
            </div>
            <img alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCSkjVEPcQUhIGIg8cmqkPErvhjIHk7uEsQ-_Bt9s9YKT6VZNrmNGtVt__2fALBimO1o_2IlFT0fofEEG6fOINf1oETawI53jBQR-qGEqGdMNeNgEvMfeo7NkpAwB8Z1rl9TOY036lsK2WN3Scf4swYkkFydUbygu1Fk094dcqc-ZdNpzfGPaL8ySQ7Eald7H3wnm4fi5uiNi7XS7TSuxJ02QIDI7LUXEs_pUSebUX4ykV1ZD1cWbi4UV-EdwjIEictEHmJxczBug" />
          </div>
          {/* Footer Navigation */}
          <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0', color: '#617589', fontSize: 14 }}>
            <p style={{ margin: 0 }}>{'\u00a9'} 2026 Cityscape Hotel Group. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default FeedbackPage;
