


import React, { useState, useRef } from "react";
import './ProfilePage.css';
import defaultProfilePic from '../../assets/profilePicture.jpg';
import logo from '../../assets/logo.svg';

export default function ProfileEdit({ user = {}, onSave = () => {}, onCancel = () => window.history.back(), onDelete = () => {} }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const fileInputRef = useRef();

  function handleProfilePicChange(e) {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(URL.createObjectURL(file));
    }
  }

  function handleSave() {
    // TODO: Add validation and API call
    onSave({ fullName, email, newPassword, profilePic });
  }

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      onDelete();
    }
  }

  return (
    <div className="profile-page" style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 0 0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="Cityscape Hotel" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <span style={{ fontWeight: 700, fontSize: 20, color: '#1e293b' }}>Cityscape Hotel</span>
        </div>
        <div style={{ marginRight: 32 }}>
          <button className="edit-profile-btn" style={{ marginRight: 12 }} onClick={onCancel}>Cancel</button>
          <button className="discover-btn" onClick={handleSave}>Save Changes</button>
        </div>
      </header>

      {/* Avatar Card (avatar above card, not overlapping) */}
      <div style={{
        maxWidth: 480,
        width: '100%',
        margin: '48px auto 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ position: 'relative', marginBottom: -70 }}>
          <img
            src={profilePic || user?.profilePic || defaultProfilePic}
            alt="Profile"
            style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '5px solid #e2e8f0', background: '#fff', boxShadow: '0 4px 24px #0002' }}
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{ position: 'absolute', bottom: 18, right: 18, background: '#1f2937', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #0002', cursor: 'pointer', borderWidth: 0 }}
            title="Change profile picture"
          >
            <svg width="22" height="22" fill="white" viewBox="0 0 20 20"><path d="M4 16a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2.172a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 6H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4zm6-7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePicChange} style={{ display: 'none' }} />
        </div>
        <div style={{
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 8px 32px #0001',
          padding: '80px 48px 32px 48px',
          width: '100%',
          marginTop: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <h2 style={{ fontWeight: 700, fontSize: 24, margin: '0 0 2px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>{fullName || user?.fullName || user?.email || 'User'}</h2>
          <div style={{ color: '#64748b', fontSize: 16, marginTop: 0, textAlign: 'center' }}>{email || user?.email || ''}</div>
          <div style={{ color: '#64748b', fontSize: 15, marginTop: 2, textAlign: 'center' }}>Travel Enthusiast &amp; Member since 2022</div>
        </div>
      </div>

      {/* Main Form Card */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: '#f8fafc', padding: '0 0 0 0' }}>
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 2px 16px #0001', padding: 40, maxWidth: 900, width: '100%', margin: '100px auto 0 auto', zIndex: 1, position: 'relative' }}>
          {/* Sections */}
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Personal Info */}
            <section style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="20" height="20" fill="#1f2937" viewBox="0 0 20 20"><path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/></svg>
                <span style={{ fontWeight: 600, fontSize: 16 }}>Personal Information</span>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" />
              </div>
            </section>

            {/* Security */}
            <section style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="20" height="20" fill="#1f2937" viewBox="0 0 20 20"><path d="M10 2a6 6 0 0 1 6 6v2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2V8a6 6 0 0 1 6-6zm0 2a4 4 0 0 0-4 4v2h8V8a4 4 0 0 0-4-4zm-4 8v4h8v-4H6z"/></svg>
                <span style={{ fontWeight: 600, fontSize: 16 }}>Security</span>
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="form-input" />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="At least 8 characters" className="form-input" />
              </div>
            </section>
          </div>

          {/* Account Management (neutral) */}
          <div style={{ marginTop: 48, background: '#fff', borderRadius: 16, padding: 24, border: '1.5px solid #e5e7eb', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: 16, boxShadow: '0 2px 8px #0001' }}>
            <svg width="28" height="28" fill="#94a3b8" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/></svg>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Account Management</h4>
              <p style={{ marginBottom: 16, color: '#64748b', fontWeight: 400 }}>Deleting your account is a permanent action. Please note that all your bookings, loyalty points, and personal history will be removed from our systems and cannot be recovered.</p>
              <button className="details-btn" style={{ background: 'transparent', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'none' }} onClick={handleDelete}>
                <svg width="18" height="18" fill="#ef4444" viewBox="0 0 20 20"><path d="M6 8a1 1 0 0 1 1 1v5a1 1 0 0 0 2 0V9a1 1 0 1 1 2 0v5a1 1 0 0 0 2 0V9a1 1 0 1 1 2 0v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a1 1 0 0 1 1-1z"/></svg>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: '24px 0 12px 0', background: 'transparent' }}>
        <div style={{ marginBottom: 8 }}>
          © 2024 Cityscape Hotel Group. All rights reserved.
        </div>
        <div>
          <a href="#" style={{ color: '#c6a969', marginRight: 16, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#c6a969', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
