import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  LockKeyhole,
  Mail,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import "./ProfilePage.css";
import defaultProfilePic from "../../assets/profilePicture.jpg";
import Navbar from "../Dashboard/Navbar";
import { logout } from "../../services/authService";
import { useNotification } from "../Notifications/NotificationProvider";
import { isStrongPassword, isValidEmail, isValidPersonName } from "../../utils/validators";
import { API_BASE_URL } from "../../config/runtimeUrls";

const API = `${API_BASE_URL}/api`;

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { confirm, notify } = useNotification();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState(defaultProfilePic);
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasBlockingReservations, setHasBlockingReservations] = useState(false);

  const resolveImage = useCallback((image) => {
    if (!image) return defaultProfilePic;
    if (image.startsWith("http")) return image;
    if (image.startsWith("/uploads")) return `${API_BASE_URL}${image}`;
    return image;
  }, []);

  const applyClient = useCallback((client) => {
    setFirstName(client.FirstName || client.firstName || "");
    setLastName(client.LastName || client.lastName || "");
    setEmail(client.Email || client.email || "");
    setProfilePic(resolveImage(client.profilePicture));
  }, [resolveImage]);

  const hasExistingReservations = useCallback((reservations = []) => {
    return reservations.some((reservation) => {
      const status = String(reservation.status || "").toLowerCase();
      return status !== "cancelled" && status !== "canceled";
    });
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");
        let loadedClient = null;

        const profileResponse = await fetch(`${API}/clients/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (profileResponse.ok) {
          loadedClient = await profileResponse.json();
          applyClient(loadedClient);
        } else {
          const profileError = await profileResponse.json().catch(() => ({}));
          console.warn("Could not load /clients/me:", profileResponse.status, profileError.message || profileResponse.statusText);
        }

        let dashboard = null;
        try {
          const dashboardResponse = await fetch(`${API}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          dashboard = dashboardResponse.ok ? await dashboardResponse.json() : null;
        } catch (dashboardErr) {
          console.warn("Could not load dashboard reservations for profile lock:", dashboardErr.message);
        }

        if (dashboard?.client && !loadedClient) {
          loadedClient = dashboard.client;
          applyClient(dashboard.client);
        }

        const dashboardReservations = dashboard?.allReservations || dashboard?.recentReservations || [];
        if (dashboardReservations.length) {
          setHasBlockingReservations(hasExistingReservations(dashboardReservations));
        } else {
          const userId = loadedClient?.ClientId || loadedClient?.clientId || localStorage.getItem("userId");
          if (userId) {
            try {
              const reservationsResponse = await fetch(`${API}/reservations?userId=${userId}`);
              const reservations = reservationsResponse.ok ? await reservationsResponse.json() : [];
              setHasBlockingReservations(hasExistingReservations(Array.isArray(reservations) ? reservations : []));
            } catch (reservationsErr) {
              console.warn("Could not load reservations for profile lock:", reservationsErr.message);
              setHasBlockingReservations(true);
            }
          }
        }

        if (!loadedClient) {
          throw new Error("Could not load your profile. Please sign in again.");
        }
      } catch (err) {
        setError(err.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [applyClient, hasExistingReservations]);

  function handleProfilePicChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setProfilePic(URL.createObjectURL(file));
  }

  async function uploadProfilePicture(token) {
    if (!selectedFile) return null;

    const formData = new FormData();
    formData.append("image", selectedFile);

    const response = await fetch(`${API}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!response.ok) throw new Error("Could not upload profile picture.");
    const data = await response.json();
    return data.imageUrl;
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isValidPersonName(firstName) || !isValidPersonName(lastName)) {
      setError("First and last name must have at least 3 letters and cannot contain numbers or special symbols.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (newPassword || confirmPassword) {
      if (!isStrongPassword(newPassword)) {
        setError("New password must have at least 8 characters, one uppercase letter and one number.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match.");
        return;
      }
      if (!currentPassword) {
        setError("Current password is required to change your password.");
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const uploadedImage = await uploadProfilePicture(token);
      let response = await fetch(`${API}/clients/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          currentPassword,
          newPassword,
          ...(uploadedImage ? { profilePicture: uploadedImage } : {})
        })
      });

      if (response.status === 404 && !newPassword && !currentPassword) {
        const userId = localStorage.getItem("userId");
        response = await fetch(`${API}/clients/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            ...(uploadedImage ? { profilePicture: uploadedImage } : {})
          })
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not save profile changes.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSelectedFile(null);
      const savedProfilePicture = data.profilePicture || uploadedImage || profilePic;
      setProfilePic(resolveImage(savedProfilePicture));
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (hasBlockingReservations) {
      setError("You cannot delete your account while you have reservations on your profile.");
      notify("You cannot delete your account while you have reservations on your profile.", "warning");
      return;
    }

    const confirmed = await confirm({
      title: "Delete account?",
      message: "This permanently removes your account, bookings, loyalty points, and profile history.",
      confirmText: "Delete",
      cancelText: "Keep account",
      tone: "danger"
    });
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/clients/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409) {
          throw new Error(data.message || "You cannot delete your account while you have reservations on your profile.");
        }
        throw new Error(data.message || "Could not delete account.");
      }

      logout();
      navigate("/login");
    } catch (err) {
      setError(err.message || "Could not delete account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="profile-edit-page">
          <div className="profile-edit-loading">Loading profile...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="profile-edit-page">
        <form className="profile-edit-shell" onSubmit={handleSave}>
          <header className="profile-edit-hero">
            <div>
              <h1>Edit Profile</h1>
              <span>Update your personal details, profile photo, and account security.</span>
            </div>
            <div className="profile-edit-actions">
              <button type="button" className="profile-edit-secondary" onClick={() => navigate("/profile")}>
                Cancel
              </button>
              <button type="submit" className="profile-edit-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </header>

          {(message || error) && (
            <div className={`profile-edit-alert ${error ? "error" : "success"}`}>
              {error ? <ShieldAlert size={16} /> : <Check size={16} />}
              {error || message}
            </div>
          )}

          <section className="profile-edit-overview">
            <div className="profile-edit-photo">
              <img src={profilePic} alt="Profile" onError={(event) => { event.currentTarget.src = defaultProfilePic; }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Change profile picture">
                <Camera size={18} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePicChange} />
            </div>
            <div>
              <h2>{firstName || "User"} {lastName}</h2>
              <span>Explorer Member</span>
            </div>
          </section>

          <section className="profile-edit-layout">
            <div className="profile-edit-section">
              <div className="profile-edit-section-title">
                <UserRound size={18} />
                <h3>Personal Information</h3>
              </div>

              <div className="profile-edit-grid two">
                <label>
                  First Name
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </label>
                <label>
                  Last Name
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
              </div>

              <label className="profile-edit-field">
                Email Address
                <div className="profile-edit-input-icon">
                  <Mail size={16} />
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
              </label>
            </div>

            <div className="profile-edit-section">
              <div className="profile-edit-section-title">
                <LockKeyhole size={18} />
                <h3>Security</h3>
              </div>

              <div className="profile-edit-grid">
                <label>
                  Current Password
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                </label>
                <label>
                  New Password
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
                </label>
                <label>
                  Confirm New Password
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat new password" />
                </label>
              </div>
            </div>

            <div className="profile-danger-zone">
              <div>
                <ShieldAlert size={20} />
                <div>
                  <h3>Account Management</h3>
                  <p>
                    {hasBlockingReservations
                      ? "You have reservations on your profile, so account deletion is currently unavailable."
                      : "Deleting your account is permanent and removes bookings, loyalty points, and profile history."}
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleDelete} disabled={deleting || hasBlockingReservations}>
                <Trash2 size={16} />
                {hasBlockingReservations ? "Locked" : deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </section>
        </form>
      </main>
    </>
  );
}
