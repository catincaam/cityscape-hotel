import React from 'react';
import { MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../../../config/runtimeUrls';
import defaultProfilePicture from '../../../assets/profilePicture.jpg';

function stars(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('');
}

function resolveAvatarUrl(value) {
  if (!value || typeof value !== 'string') return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/assets/')) return value;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return value;
}

function SentimentAvatar({ item }) {
  const [fallback, setFallback] = React.useState(false);
  const profileAvatar = resolveAvatarUrl(item.avatar);
  const avatar = fallback || !profileAvatar ? defaultProfilePicture : profileAvatar;

  return (
    <img
      src={avatar}
      alt={item.guestName}
      loading="lazy"
      onError={(event) => {
        if (event.currentTarget.src !== defaultProfilePicture) {
          setFallback(true);
        }
      }}
    />
  );
}

export default function GuestSentiment({ data, loading, onViewAll }) {
  return (
    <section className="dashboard-card guest-sentiment">
      <div className="dashboard-card-heading sentiment-heading">
        <h3>Recent Feedback</h3>
        <button type="button" onClick={onViewAll}>View all feedback</button>
      </div>
      {loading ? (
        <div className="dashboard-empty">Loading feedback...</div>
      ) : data.length ? (
        <div className="sentiment-grid">
          {data.slice(0, 3).map((item) => (
            <article className="sentiment-card" key={item.id}>
              <div className="sentiment-person">
                <SentimentAvatar item={item} />
                <div>
                  <strong>{item.guestName}</strong>
                  <span>{stars(item.rating)}</span>
                </div>
              </div>
              <p>"{item.comment}"</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="sentiment-grid">
          <article className="sentiment-card empty">
            <MessageSquare size={28} />
            <p>No feedback available yet</p>
          </article>
        </div>
      )}
    </section>
  );
}
