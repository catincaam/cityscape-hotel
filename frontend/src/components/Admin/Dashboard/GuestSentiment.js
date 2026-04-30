import React from 'react';
import { MessageSquare } from 'lucide-react';

function stars(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Array.from({ length: 5 }, (_, index) => (index < rounded ? '★' : '☆')).join('');
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
                {item.avatar ? <img src={item.avatar} alt={item.guestName} /> : <MessageSquare size={22} />}
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
