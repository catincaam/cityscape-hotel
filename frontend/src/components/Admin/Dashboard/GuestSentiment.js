import React from 'react';
import { MessageSquare } from 'lucide-react';
import { API_BASE_URL } from '../../../config/runtimeUrls';

function stars(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('');
}

function resolveAvatarUrl(value) {
  if (!value || typeof value !== 'string') return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return value;
}

function initials(name = 'Guest') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G';
}

function generatedAvatarUrl(name = 'Guest') {
  const seed = encodeURIComponent(name.trim() || 'Guest');
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&radius=50&backgroundColor=f6efe7,dac5a3,efe7dc`;
}

function SentimentAvatar({ item }) {
  const [fallback, setFallback] = React.useState(false);
  const profileAvatar = resolveAvatarUrl(item.avatar);
  const avatar = fallback || !profileAvatar
    ? generatedAvatarUrl(item.guestName)
    : profileAvatar;

  if (!avatar) {
    return <span className="sentiment-avatar-fallback">{initials(item.guestName)}</span>;
  }

  return (
    <img
      src={avatar}
      alt={item.guestName}
      loading="lazy"
      onError={() => setFallback(true)}
    />
  );
}

export default function GuestSentiment({ data, loading, onViewAll }) {
  return (
    <section className="dashboard-card guest-sentiment">
      <div className="dashboard-card-heading sentiment-heading">
        <h3>Guest Sentiment</h3>
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
