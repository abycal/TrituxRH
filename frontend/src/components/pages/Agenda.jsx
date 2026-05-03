import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import keycloak from '../../keycloak';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMondayBasedDay(date) {
  return (date.getDay() + 6) % 7; // 0=Mon … 6=Sun
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateRange(start, end) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (!e || isSameDay(s, e)) {
    return s.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  return `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

// Color palette for events
const EVENT_COLORS = [
  { bg: 'hsl(var(--primary) / 0.15)', border: 'hsl(var(--primary))', text: 'hsl(var(--primary))' },
  { bg: 'hsl(142 70% 45% / 0.15)', border: 'hsl(142 70% 45%)', text: 'hsl(142 60% 35%)' },
  { bg: 'hsl(38 92% 50% / 0.15)', border: 'hsl(38 92% 50%)', text: 'hsl(38 80% 35%)' },
  { bg: 'hsl(280 65% 60% / 0.15)', border: 'hsl(280 65% 60%)', text: 'hsl(280 55% 45%)' },
  { bg: 'hsl(0 72% 51% / 0.15)', border: 'hsl(0 72% 51%)', text: 'hsl(0 60% 40%)' },
];

function getEventColor(index) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectBanner({ onConnect, connecting }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: '24px', textAlign: 'center',
    }}>
      {/* Google Calendar illustration */}
      <div style={{
        width: 80, height: 80, borderRadius: '20px',
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))',
        border: '1px solid hsl(var(--primary) / 0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px hsl(var(--primary) / 0.1)',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
          <text x="12" y="18" textAnchor="middle" fill="hsl(var(--primary))" fontSize="7" fontWeight="700">G</text>
        </svg>
      </div>

      <div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
          Connecter Google Calendar
        </h2>
        <p style={{ margin: 0, color: 'hsl(var(--nav-muted))', fontSize: '0.875rem', maxWidth: 380 }}>
          Autorisez l'accès à votre agenda Google pour afficher vos événements directement dans Tritux RH.
        </p>
      </div>

      <button
        onClick={onConnect}
        disabled={connecting}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: connecting ? 'default' : 'pointer',
          background: connecting ? 'hsl(var(--nav-active))' : 'hsl(var(--primary))',
          color: 'white', fontWeight: 600, fontSize: '0.9rem',
          transition: 'all 0.2s ease', opacity: connecting ? 0.7 : 1,
          boxShadow: '0 4px 16px hsl(var(--primary) / 0.3)',
        }}
      >
        {connecting ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Connexion...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Connecter Google Calendar
          </>
        )}
      </button>
    </div>
  );
}

function EventDot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
      background: color.border, flexShrink: 0,
    }} />
  );
}

function EventModal({ event, onClose }) {
  if (!event) return null;
  const color = getEventColor(0);
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'hsl(0 0% 0% / 0.4)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'hsl(var(--background))', borderRadius: '20px',
          padding: '28px', maxWidth: 440, width: '90%',
          boxShadow: '0 24px 64px hsl(0 0% 0% / 0.2)',
          border: '1px solid hsl(var(--nav-active))',
          animation: 'slide-up 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'hsl(var(--primary) / 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--foreground))', lineHeight: 1.3 }}>
              {event.summary || '(Sans titre)'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'hsl(var(--nav-muted))', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Date */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
              {formatDateRange(start, end)}
              {event.start?.dateTime && (
                <span style={{ color: 'hsl(var(--nav-muted))', marginLeft: 6 }}>
                  {formatTime(start)}{end && ` → ${formatTime(end)}`}
                </span>
              )}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--nav-muted))', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {event.description.replace(/<[^>]*>/g, '')}
              </p>
            </div>
          )}

          {/* Organizer */}
          {event.organizer?.email && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--nav-muted))' }}>
                {event.organizer.displayName || event.organizer.email}
              </span>
            </div>
          )}
        </div>

        {/* Link to Google */}
        {event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 20, padding: '10px', borderRadius: 10, textDecoration: 'none',
              background: 'hsl(var(--nav-active))', color: 'hsl(var(--foreground))',
              fontSize: '0.8rem', fontWeight: 500, transition: 'background 0.2s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Ouvrir dans Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Agenda() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('month'); // 'month' | 'week' | 'list'

  // ── OAuth callback handling ────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Exchange code for token via backend
      api.post('/calendar/oauth/callback', { code })
        .then(() => {
          setConnected(true);
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => setError("Erreur lors de la connexion Google."));
    }
  }, []);

  // ── Check connection status + load events ─────────────────────────────────
  useEffect(() => {
    api.get('/calendar/status')
      .then(res => {
        setConnected(res.data.connected);
        if (res.data.connected) loadEvents();
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadEvents = useCallback((date = currentDate) => {
    setLoading(true);
    const timeMin = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
    const timeMax = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

    api.get('/calendar/events', { params: { timeMin, timeMax } })
      .then(res => {
        setEvents(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger les événements.");
        setLoading(false);
      });
  }, []);

  // ── Reload events on month change ─────────────────────────────────────────
  useEffect(() => {
    if (connected) loadEvents(currentDate);
  }, [currentDate, connected]);

  // ── Connect Google ─────────────────────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api.get('/calendar/oauth/url');
      window.location.href = res.data.url;
    } catch {
      setError("Impossible de lancer la connexion Google.");
      setConnecting(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // ── Compute calendar grid ─────────────────────────────────────────────────
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getMondayBasedDay(startOfMonth(currentDate));
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getEventsForDay = (day) => {
    const target = new Date(year, month, day);
    target.setHours(0, 0, 0, 0);

    return events.filter(ev => {
      const isAllDay = !ev.start?.dateTime; // true = all-day event (date only)
      const start = new Date(ev.start?.dateTime || ev.start?.date);
      start.setHours(0, 0, 0, 0);

      if (isAllDay) {
        // Google Calendar : end date est EXCLUSIVE pour les all-day events
        // ex: événement le 16 avril → end = "2026-04-17" (lendemain)
        // donc on compare start <= target < end (sans inclure le jour de fin)
        const end = new Date(ev.end?.date);
        end.setHours(0, 0, 0, 0);
        return start <= target && target < end;
      } else {
        // Événement avec heure : on affiche uniquement sur le jour de début
        return isSameDay(start, target);
      }
    });
  };

  const today = new Date();

  // ── Upcoming events (list view) ────────────────────────────────────────────
  const upcomingEvents = [...events]
    .filter(ev => new Date(ev.start?.dateTime || ev.start?.date) >= new Date(year, month, 1))
    .sort((a, b) => new Date(a.start?.dateTime || a.start?.date) - new Date(b.start?.dateTime || b.start?.date));

  // ─────────────────────────────────────────────────────────────────────────
  if (loading && !connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  if (!connected) {
    return <ConnectBanner onConnect={handleConnect} connecting={connecting} />;
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cal-day:hover { background: hsl(var(--nav-active) / 0.5) !important; }
        .event-chip:hover { filter: brightness(1.05); cursor: pointer; }
        .view-btn:hover { background: hsl(var(--nav-active)) !important; }
        .nav-btn:hover { background: hsl(var(--nav-active)) !important; }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Month navigation */}
          <button className="nav-btn" onClick={prevMonth} style={{
            background: 'hsl(var(--nav-bg))', border: '1px solid hsl(var(--nav-active))',
            borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'hsl(var(--foreground))', transition: 'background 0.2s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              {MONTHS_FR[month]} {year}
            </h2>
          </div>

          <button className="nav-btn" onClick={nextMonth} style={{
            background: 'hsl(var(--nav-bg))', border: '1px solid hsl(var(--nav-active))',
            borderRadius: 10, width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'hsl(var(--foreground))', transition: 'background 0.2s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <button onClick={goToday} style={{
            background: 'none', border: '1px solid hsl(var(--nav-active))',
            borderRadius: 10, padding: '6px 14px', cursor: 'pointer',
            color: 'hsl(var(--foreground))', fontSize: '0.8rem', fontWeight: 500,
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--nav-active))'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Aujourd'hui
          </button>
        </div>

        {/* View switcher */}
        <div style={{
          display: 'flex', gap: 2, background: 'hsl(var(--nav-bg))',
          border: '1px solid hsl(var(--nav-active))', borderRadius: 12, padding: 3,
        }}>
          {[
            { key: 'month', label: 'Mois' },
            { key: 'list', label: 'Liste' },
          ].map(v => (
            <button
              key={v.key}
              className="view-btn"
              onClick={() => setView(v.key)}
              style={{
                padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: view === v.key ? 'hsl(var(--primary))' : 'transparent',
                color: view === v.key ? 'white' : 'hsl(var(--nav-muted))',
                fontWeight: view === v.key ? 600 : 400,
                fontSize: '0.8rem', transition: 'all 0.2s',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'hsl(0 72% 51% / 0.1)', border: '1px solid hsl(0 72% 51% / 0.3)',
          color: 'hsl(0 60% 40%)', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'month' && (
        <div style={{
          background: 'hsl(var(--nav-bg))', borderRadius: 20,
          border: '1px solid hsl(var(--nav-active))',
          overflow: 'hidden',
          boxShadow: '0 4px 24px hsl(0 0% 0% / 0.06)',
        }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid hsl(var(--nav-active))' }}>
            {DAYS_FR.map(d => (
              <div key={d} style={{
                padding: '12px 0', textAlign: 'center',
                fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'hsl(var(--nav-muted))',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1;
              const isCurrentMonth = day >= 1 && day <= daysInMonth;
              const isToday = isCurrentMonth && isSameDay(new Date(year, month, day), today);
              const dayEvents = isCurrentMonth ? getEventsForDay(day) : [];
              const colBorder = i % 7 !== 6 ? '1px solid hsl(var(--nav-active) / 0.5)' : 'none';
              const rowBorder = i < totalCells - 7 ? '1px solid hsl(var(--nav-active) / 0.5)' : 'none';

              return (
                <div
                  key={i}
                  className="cal-day"
                  style={{
                    minHeight: 100, padding: '8px 8px 6px',
                    borderRight: colBorder, borderBottom: rowBorder,
                    background: isToday ? 'hsl(var(--primary) / 0.04)' : 'transparent',
                    transition: 'background 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Day number — toujours affiché, grisé si hors mois */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4,
                    background: isToday ? 'hsl(var(--primary))' : 'transparent',
                    color: isToday
                      ? 'white'
                      : isCurrentMonth
                        ? 'hsla(0, 0%, 90%, 0.62)'
                        : 'hsl(var(--nav-muted) / 0.4)',
                    fontSize: '0.8rem', fontWeight: isToday ? 700 : 400,
                  }}>
                    {isCurrentMonth
                      ? day
                      : day < 1
                        ? getDaysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1) + day
                        : day - daysInMonth
                    }
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.slice(0, 3).map((ev, idx) => {
                      const color = getEventColor(idx);
                      return (
                        <div
                          key={ev.id}
                          className="event-chip"
                          onClick={() => setSelectedEvent(ev)}
                          style={{
                            padding: '2px 6px', borderRadius: 5,
                            background: color.bg, borderLeft: `3px solid ${color.border}`,
                            fontSize: '0.7rem', color: color.text, fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            transition: 'filter 0.15s',
                          }}
                          title={ev.summary}
                        >
                          {ev.start?.dateTime && (
                            <span style={{ opacity: 0.7, marginRight: 3 }}>{formatTime(ev.start.dateTime)}</span>
                          )}
                          {ev.summary || '(Sans titre)'}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '0.65rem', color: 'hsl(var(--nav-muted))', paddingLeft: 4 }}>
                        +{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'hsl(var(--nav-muted))' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            </div>
          )}
          {!loading && upcomingEvents.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              color: 'hsl(var(--nav-muted))', fontSize: '0.875rem',
            }}>
              Aucun événement ce mois-ci
            </div>
          )}
          {upcomingEvents.map((ev, idx) => {
            const start = ev.start?.dateTime || ev.start?.date;
            const end = ev.end?.dateTime || ev.end?.date;
            const color = getEventColor(idx);
            const startDate = new Date(start);
            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                style={{
                  display: 'flex', gap: 16, padding: '14px 18px',
                  background: 'hsl(var(--nav-bg))', borderRadius: 14,
                  border: '1px solid hsl(var(--nav-active))',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 2px 8px hsl(0 0% 0% / 0.04)',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Date column */}
                <div style={{
                  flexShrink: 0, width: 52, textAlign: 'center',
                  borderRight: `2px solid ${color.border}`, paddingRight: 16,
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color.text, lineHeight: 1 }}>
                    {startDate.getDate()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'hsl(var(--nav-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {MONTHS_FR[startDate.getMonth()].slice(0, 3)}
                  </div>
                </div>

                {/* Event info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <EventDot color={color} />
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'hsla(0, 0%, 100%, 0.72)' }}>
                      {ev.summary || '(Sans titre)'}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {ev.start?.dateTime && (
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--nav-muted))', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatTime(start)}{end && ` — ${formatTime(end)}`}
                      </span>
                    )}
                    {ev.location && (
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--nav-muted))', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--nav-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, alignSelf: 'center' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Event detail modal ── */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </>
  );
}