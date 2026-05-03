import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ── N8N Webhook URL (Workflow #4) ─────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/generate-job-offer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  titleFr: '', titleEn: '',
  descriptionFr: '', descriptionEn: '',
  location: '',
  typeFr: 'CDI', typeEn: 'Full-time',
  experienceFr: '', experienceEn: '',
  departmentFr: '', departmentEn: '',
  tags: '',
  active: true,
  responsibilitiesFr: [],
  responsibilitiesEn: [],
  qualificationsFr: [],
  qualificationsEn: [],
  niceToHaveFr: [],
  niceToHaveEn: [],
};

function deserializeOffer(offer) {
  const parse = (v) => { try { return v ? JSON.parse(v) : {}; } catch { return {}; } };
  const fr = parse(offer.fullDescriptionFr);
  const en = parse(offer.fullDescriptionEn);
  return {
    ...offer,
    active: offer.active ?? true,
    tags: offer.tagList ? offer.tagList.join(',') : offer.tags || '',
    responsibilitiesFr: fr.responsibilities || [],
    responsibilitiesEn: en.responsibilities || [],
    qualificationsFr: fr.qualifications || [],
    qualificationsEn: en.qualifications || [],
    niceToHaveFr: fr.niceToHave || [],
    niceToHaveEn: en.niceToHave || [],
  };
}

function serializeForm(form) {
  const { responsibilitiesFr, responsibilitiesEn, qualificationsFr, qualificationsEn,
    niceToHaveFr, niceToHaveEn, ...rest } = form;
  return {
    ...rest,
    fullDescriptionFr: JSON.stringify({
      responsibilities: responsibilitiesFr.filter(Boolean),
      qualifications: qualificationsFr.filter(Boolean),
      niceToHave: niceToHaveFr.filter(Boolean),
    }),
    fullDescriptionEn: JSON.stringify({
      responsibilities: responsibilitiesEn.filter(Boolean),
      qualifications: qualificationsEn.filter(Boolean),
      niceToHave: niceToHaveEn.filter(Boolean),
    }),
  };
}

// ── Icônes ────────────────────────────────────────────────────────────────────
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const IconArchive = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>;
const IconRestore = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.51" /></svg>;
const IconRemove = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconUsers = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconSend = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const IconMic = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
const IconMicOff = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>;
const IconSparkle = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="13" y2="14" />
  </svg>
);
const IconClose = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconMinimize = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IconFlagFr = () => (
  <svg width="16" height="12" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', flexShrink: 0 }}>
    <rect width="10" height="20" fill="#002395" />
    <rect x="10" width="10" height="20" fill="#EDEDED" />
    <rect x="20" width="10" height="20" fill="#ED2939" />
  </svg>
);
const IconFlagEn = () => (
  <svg width="16" height="12" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '2px', flexShrink: 0 }}>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
    <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
  </svg>
);
const IconMapPin = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconBriefcase = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
const IconClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconBuilding = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>;
const IconTag = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
const IconList = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>;
const IconAward = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>;
const IconStar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconFileText = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const IconCheckCircle = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const IconBox = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>;
const IconInbox = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;

// ── Composant : éditeur de liste dynamique bilingue ───────────────────────────
function ListEditor({ labelFr, labelEn, valuesFr, valuesEn, onChange }) {
  const inputStyle = {
    flex: 1, padding: '6px 10px', borderRadius: '8px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--muted) / 0.4)',
    color: 'hsl(var(--foreground))',
    fontSize: '0.8rem', outline: 'none',
  };
  const btnStyle = (color) => ({
    padding: '4px 8px', borderRadius: '6px', border: 'none',
    background: color || 'hsl(var(--muted))',
    color: color ? '#fff' : 'hsl(var(--muted-foreground))',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    flexShrink: 0,
  });

  const addRow = () => onChange([...valuesFr, ''], [...valuesEn, '']);
  const updateFr = (i, v) => { const a = [...valuesFr]; a[i] = v; onChange(a, valuesEn); };
  const updateEn = (i, v) => { const a = [...valuesEn]; a[i] = v; onChange(valuesFr, a); };
  const remove = (i) => onChange(valuesFr.filter((_, j) => j !== i), valuesEn.filter((_, j) => j !== i));
  const maxLen = Math.max(valuesFr.length, valuesEn.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {maxLen > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '8px', marginBottom: '2px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}><IconFlagFr /> {labelFr}</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}><IconFlagEn /> {labelEn}</span>
          <span />
        </div>
      )}
      {Array.from({ length: maxLen }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '8px', alignItems: 'center' }}>
          <input style={inputStyle} value={valuesFr[i] || ''} onChange={(e) => updateFr(i, e.target.value)} placeholder={`${labelFr} ${i + 1}…`} />
          <input style={inputStyle} value={valuesEn[i] || ''} onChange={(e) => updateEn(i, e.target.value)} placeholder={`${labelEn} ${i + 1}…`} />
          <button type="button" onClick={() => remove(i)} style={btnStyle('hsl(var(--destructive) / 0.8)')}><IconRemove /></button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={{ ...btnStyle(), padding: '6px 12px', borderRadius: '8px', border: '1px dashed hsl(var(--border))', fontSize: '0.78rem', gap: '5px', alignSelf: 'flex-start' }}>
        <IconPlus /> Ajouter une ligne
      </button>
    </div>
  );
}

// ── Formulaire ────────────────────────────────────────────────────────────────
function OfferForm({ initial, onSave, onCancel, loading, aiPrefilled }) {
  const [form, setForm] = useState(initial ? deserializeOffer(initial) : EMPTY_FORM);
  const [highlightedFields, setHighlightedFields] = useState(new Set());
  const isEdit = !!initial?.id;

  // Apply AI-prefilled data when it arrives
  useEffect(() => {
    if (aiPrefilled) {
      setForm(f => ({ ...f, ...aiPrefilled }));
      // Highlight fields that were filled by AI
      const filled = Object.entries(aiPrefilled)
        .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : v !== ''))
        .map(([k]) => k);
      setHighlightedFields(new Set(filled));
      setTimeout(() => setHighlightedFields(new Set()), 4000);
    }
  }, [aiPrefilled]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const setLists = (frKey, enKey) => (fr, en) =>
    setForm((f) => ({ ...f, [frKey]: fr, [enKey]: en }));

  const handleSubmit = (e) => { e.preventDefault(); onSave(serializeForm(form)); };

  const aiGlow = (field) => highlightedFields.has(field) ? {
    boxShadow: '0 0 0 2px hsl(var(--foreground) / 0.2)',
    borderColor: 'hsl(var(--foreground) / 0.5)',
    transition: 'box-shadow 0.3s, border-color 0.3s',
  } : {};

  const inputStyle = (field) => ({
    width: '100%', padding: '8px 12px', borderRadius: '10px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--muted) / 0.4)',
    color: 'hsl(var(--foreground))',
    fontSize: '0.875rem', outline: 'none',
    ...aiGlow(field),
  });
  const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'block' };
  const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="premium-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '92vh', overflowY: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{isEdit ? "Modifier l'offre" : 'Nouvelle offre'}</h2>
            {aiPrefilled && (
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconSparkle size={12} /> Pré-rempli par l'IA — vérifiez et complétez les champs manquants
              </p>
            )}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '6px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}><IconClose /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Titre bilingue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconFlagFr /> Titre *</label><input style={inputStyle('titleFr')} value={form.titleFr} onChange={set('titleFr')} placeholder="Développeur Full-Stack…" required /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconFlagEn /> Title *</label><input style={inputStyle('titleEn')} value={form.titleEn} onChange={set('titleEn')} placeholder="Full-Stack Developer…" required /></div>
          </div>

          {/* Description courte */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconFlagFr /> Description courte *</label><textarea style={{ ...inputStyle('descriptionFr'), resize: 'vertical', minHeight: '80px' }} value={form.descriptionFr} onChange={set('descriptionFr')} placeholder="Description visible sur la liste des offres…" required /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconFlagEn /> Short description *</label><textarea style={{ ...inputStyle('descriptionEn'), resize: 'vertical', minHeight: '80px' }} value={form.descriptionEn} onChange={set('descriptionEn')} placeholder="Description shown on the job list…" required /></div>
          </div>

          {/* Localisation + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconMapPin /> Localisation *</label><input style={inputStyle('location')} value={form.location} onChange={set('location')} placeholder="Tunis, Tunisia" required /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconBriefcase /> Type FR</label><input style={inputStyle('typeFr')} value={form.typeFr} onChange={set('typeFr')} placeholder="CDI" /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconBriefcase /> Type EN</label><input style={inputStyle('typeEn')} value={form.typeEn} onChange={set('typeEn')} placeholder="Full-time" /></div>
          </div>

          {/* Expérience + Département */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconClock /> Expérience FR</label><input style={inputStyle('experienceFr')} value={form.experienceFr} onChange={set('experienceFr')} placeholder="3-5 ans" /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconClock /> Experience EN</label><input style={inputStyle('experienceEn')} value={form.experienceEn} onChange={set('experienceEn')} placeholder="3-5 years" /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconBuilding /> Département FR</label><input style={inputStyle('departmentFr')} value={form.departmentFr} onChange={set('departmentFr')} placeholder="Ingénierie" /></div>
            <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconBuilding /> Department EN</label><input style={inputStyle('departmentEn')} value={form.departmentEn} onChange={set('departmentEn')} placeholder="Engineering" /></div>
          </div>

          {/* Tags */}
          <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconTag /> Tags (séparés par des virgules)</label><input style={inputStyle('tags')} value={form.tags} onChange={set('tags')} placeholder="Vue.js,Node.js,AWS" /></div>

          {/* Listes */}
          <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconList /> Responsabilités</label><ListEditor labelFr="Responsabilité" labelEn="Responsibility" valuesFr={form.responsibilitiesFr} valuesEn={form.responsibilitiesEn} onChange={setLists('responsibilitiesFr', 'responsibilitiesEn')} /></div>
          <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconAward /> Qualifications requises</label><ListEditor labelFr="Qualification" labelEn="Qualification" valuesFr={form.qualificationsFr} valuesEn={form.qualificationsEn} onChange={setLists('qualificationsFr', 'qualificationsEn')} /></div>
          <div style={sectionStyle}><label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '5px'}}><IconStar /> Nice to have</label><ListEditor labelFr="Atout" labelEn="Nice to have" valuesFr={form.niceToHaveFr} valuesEn={form.niceToHaveEn} onChange={setLists('niceToHaveFr', 'niceToHaveEn')} /></div>

          {/* Statut + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid hsl(var(--border))' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
              <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }} />
              Publier immédiatement
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onCancel} style={{ padding: '9px 20px', borderRadius: '9999px', border: '1px solid hsl(var(--border))', background: 'none', color: 'hsl(var(--foreground))', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '9999px', border: 'none', background: 'hsl(var(--foreground))', color: 'hsl(var(--card))', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : "Publier l'offre"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AI Chatbot Bubble ─────────────────────────────────────────────────────────
function AIChatbot({ onOfferGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis votre assistant RH IA.\n\nDécrivez-moi l'offre d'emploi que vous souhaitez créer (en français, anglais ou arabe) et je la génère automatiquement.\n\nExemple : *\"Je cherche un développeur Java senior avec 5 ans d'expérience pour le département tech, CDI à Tunis, maîtrise Spring Boot et microservices requise.\"*",
      isWelcome: true,
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop pulsing after 5s
  useEffect(() => {
    const t = setTimeout(() => setIsPulsing(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const callN8N = async (prompt) => {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error(`n8n error: ${response.status}`);
    const data = await response.json();
    if (!data.success || !data.offer) throw new Error('Réponse invalide de n8n');
    return data.offer;
  };

  const sendMessage = useCallback(async (text) => {
    const prompt = text.trim();
    if (!prompt || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsLoading(true);

    // Thinking message
    setMessages(prev => [...prev, { role: 'assistant', content: '...', isThinking: true }]);

    try {
      const offer = await callN8N(prompt);

      // Replace thinking with success
      setMessages(prev => [
        ...prev.filter(m => !m.isThinking),
        {
          role: 'assistant',
          content: `**Offre générée avec succès !**\n\nJ'ai créé une offre pour **${offer.titleFr || offer.titleEn || 'ce poste'}**. Le formulaire a été pré-rempli avec les informations extraites.\n\nVérifiez et complétez les champs vides avant de publier.`,
          isSuccess: true,
        }
      ]);

      // Map offer to form format
      const formData = {
        titleFr: offer.titleFr || '',
        titleEn: offer.titleEn || '',
        descriptionFr: offer.descriptionFr || '',
        descriptionEn: offer.descriptionEn || '',
        location: offer.location || '',
        typeFr: offer.typeFr || '',
        typeEn: offer.typeEn || '',
        experienceFr: offer.experienceFr || '',
        experienceEn: offer.experienceEn || '',
        departmentFr: offer.departmentFr || '',
        departmentEn: offer.departmentEn || '',
        tags: offer.tags || '',
        active: true,
        responsibilitiesFr: Array.isArray(offer.responsibilitiesFr) ? offer.responsibilitiesFr : [],
        responsibilitiesEn: Array.isArray(offer.responsibilitiesEn) ? offer.responsibilitiesEn : [],
        qualificationsFr: Array.isArray(offer.qualificationsFr) ? offer.qualificationsFr : [],
        qualificationsEn: Array.isArray(offer.qualificationsEn) ? offer.qualificationsEn : [],
        niceToHaveFr: Array.isArray(offer.niceToHaveFr) ? offer.niceToHaveFr : [],
        niceToHaveEn: Array.isArray(offer.niceToHaveEn) ? offer.niceToHaveEn : [],
      };

      onOfferGenerated(formData);

    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => !m.isThinking),
        {
          role: 'assistant',
          content: `**Erreur lors de la génération**\n\n${err.message}\n\nVérifiez que n8n est démarré et que le Workflow #4 est actif.`,
          isError: true,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onOfferGenerated]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Web Speech API for voice
  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    setIsRecording(true);
  };

  const bubbleStyle = {
    position: 'fixed',
    bottom: '28px',
    right: '28px',
    zIndex: 999,
    // fixed = hors du flux, ne prend aucun espace dans le layout
  };

  const orb = (
    <button
      onClick={() => { setIsOpen(true); setIsMinimized(false); }}
      style={{
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.25)',
        cursor: 'pointer',
        // Verre au repos : fond très transparent avec blur
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Couleur de l'icône adaptée au thème (foreground à 70%)
        color: 'hsl(var(--foreground) / 0.7)',
        transition: 'background 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease, color 0.25s ease, border-color 0.25s ease',
        animation: isPulsing ? 'trituxPulse 2.5s ease-in-out infinite' : 'none',
      }}
      onMouseEnter={e => {
        // Au hover : devient opaque, coloré, légèrement agrandi
        e.currentTarget.style.background = 'hsl(var(--foreground))';
        e.currentTarget.style.color = 'hsl(var(--card))';
        e.currentTarget.style.border = '1px solid transparent';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.22)';
        e.currentTarget.style.transform = 'scale(1.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
        e.currentTarget.style.color = 'hsl(var(--foreground) / 0.7)';
        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title="Assistant IA — Créer une offre"
    >
      <IconSparkle size={20} />
    </button>
  );

  const chatWindow = (
    <div
      style={{
        width: '400px',
        height: isMinimized ? '56px' : '520px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border))',
        background: 'hsl(var(--card))',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: 'hsl(var(--foreground))',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'hsl(var(--card))', flexShrink: 0,
        }}>
          <IconSparkle size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Assistant IA Tritux</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
            {isLoading ? 'Génération en cours…' : '● En ligne · Groq + Llama 3.3'}
          </p>
        </div>
        <button
          onClick={() => setIsMinimized(m => !m)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
          title="Réduire"
        >
          <IconMinimize />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
          title="Fermer"
        >
          <IconClose />
        </button>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: 'hsl(var(--foreground))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'hsl(var(--card))', fontSize: '10px',
                  }}>
                    <IconSparkle size={13} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'hsl(var(--foreground))'
                      : msg.isThinking ? 'hsl(var(--muted))'
                      : msg.isSuccess ? 'hsl(142 70% 45% / 0.12)'
                      : msg.isError ? 'hsl(var(--destructive) / 0.1)'
                      : 'hsl(var(--muted))',
                    color: msg.role === 'user' ? '#fff' : 'hsl(var(--foreground))',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    border: msg.isSuccess ? '1px solid hsl(142 70% 45% / 0.3)' : msg.isError ? '1px solid hsl(var(--destructive) / 0.3)' : 'none',
                  }}
                >
                  {msg.isThinking ? (
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ animation: 'trituxDot 1.4s infinite 0s', display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--muted-foreground))' }} />
                      <span style={{ animation: 'trituxDot 1.4s infinite 0.2s', display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--muted-foreground))' }} />
                      <span style={{ animation: 'trituxDot 1.4s infinite 0.4s', display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--muted-foreground))' }} />
                    </span>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid hsl(var(--border))',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            background: 'hsl(var(--card))',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez le poste ..."
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--muted) / 0.5)',
                color: 'hsl(var(--foreground))',
                fontSize: '0.82rem',
                outline: 'none',
                resize: 'none',
                minHeight: '36px',
                maxHeight: '90px',
                overflow: 'auto',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={toggleRecording}
              title={isRecording ? "Arrêter l'enregistrement" : "Dicter par voix"}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: isRecording ? 'hsl(var(--destructive))' : 'hsl(var(--muted))',
                color: isRecording ? '#fff' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: isRecording ? 'trituxPulse 1s infinite' : 'none',
              }}
            >
              {isRecording ? <IconMicOff /> : <IconMic />}
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: input.trim() && !isLoading
                  ? 'hsl(var(--foreground))'
                  : 'hsl(var(--muted))',
                color: input.trim() && !isLoading ? '#fff' : 'hsl(var(--muted-foreground))',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <IconSend />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes trituxPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
        @keyframes trituxDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={bubbleStyle}>
        {isOpen ? chatWindow : orb}
      </div>
    </>
  );
}

// ── Carte d'offre (cliquable + compteur candidats) ────────────────────────────
function OfferCard({ offer, onEdit, onToggle, onDelete, onNavigate }) {
  const [candidateCount, setCandidateCount] = useState(null);
  const tags = offer.tagList ?? [];

  useEffect(() => {
    api.get(`/candidats-externes/offre/${offer.id}`)
      .then((res) => setCandidateCount(res.data.length))
      .catch(() => setCandidateCount(0));
  }, [offer.id]);

  const actionBtn = (label, icon, color, onClick) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '9999px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: color || 'hsl(var(--foreground))', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      className="premium-card"
      onClick={() => onNavigate(offer.id)}
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.1s' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--foreground))' }}>{offer.titleFr}</h3>
            <span className={`status-badge ${offer.active ? 'status-new' : 'status-completed'}`}>{offer.active ? 'Publiée' : 'Archivée'}</span>
            {candidateCount !== null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '9999px', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', fontSize: '0.72rem', fontWeight: 600 }}>
                <IconUsers /> {candidateCount} candidat{candidateCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{offer.titleEn}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {actionBtn('Modifier', <IconEdit />, null, () => onEdit(offer))}
          {actionBtn(offer.active ? 'Archiver' : 'Republier', offer.active ? <IconArchive /> : <IconRestore />, offer.active ? 'hsl(var(--status-checked-in))' : 'hsl(var(--status-new))', () => onToggle(offer))}
          {actionBtn('Supprimer', <IconTrash />, 'hsl(var(--destructive))', () => onDelete(offer))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {offer.location && <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconMapPin /> {offer.location}</span>}
        {offer.typeFr && <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconBriefcase /> {offer.typeFr}</span>}
        {offer.experienceFr && <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconClock /> {offer.experienceFr}</span>}
        {offer.departmentFr && <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconBuilding /> {offer.departmentFr}</span>}
      </div>

      {offer.descriptionFr && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {offer.descriptionFr}
        </p>
      )}

      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {tags.map((tag) => (
            <span key={tag} style={{ padding: '3px 10px', borderRadius: '9999px', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', fontSize: '0.72rem', fontWeight: 500 }}>{tag}</span>
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontSize: '0.72rem', color: 'hsl(var(--border))', textAlign: 'right' }}>
        Créée le {new Date(offer.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function JobOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [aiPrefilled, setAiPrefilled] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchOffers = async () => {
    try {
      const res = await api.get('/job-offers/all');
      setOffers(res.data);
    } catch {
      setError('Impossible de charger les offres. Vérifiez que Spring Boot est démarré.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const notify = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3500); };

  const handleSave = async (form) => {
    setSaving(true); setError('');
    try {
      if (editingOffer) {
        await api.put(`/job-offers/${editingOffer.id}`, form);
        notify('Offre mise à jour avec succès.');
      } else {
        await api.post('/job-offers', form);
        notify("Offre publiée ! Elle est maintenant visible sur le site web.");
      }
      setShowForm(false); setEditingOffer(null); setAiPrefilled(null); fetchOffers();
    } catch {
      setError("Erreur lors de l'enregistrement. Vérifiez les champs et réessayez.");
    } finally { setSaving(false); }
  };

  const handleToggle = async (offer) => {
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, active: !o.active } : o));
    try {
      await api.patch(`/job-offers/${offer.id}/toggle`);
      notify(!offer.active ? 'Offre republiée !' : "Offre archivée. Elle n'est plus visible sur le site web.");
      fetchOffers();
    } catch {
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, active: offer.active } : o));
      setError('Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Supprimer définitivement "${offer.titleFr}" ?\n\nCette action est irréversible.`)) return;
    try {
      await api.delete(`/job-offers/${offer.id}`);
      notify('Offre supprimée définitivement.');
      fetchOffers();
    } catch { setError('Erreur lors de la suppression.'); }
  };

  // Called when AI generates an offer → open form pre-filled
  const handleOfferGenerated = useCallback((formData) => {
    setEditingOffer(null);
    setAiPrefilled(formData);
    setShowForm(true);
  }, []);

  const openCreate = () => { setEditingOffer(null); setAiPrefilled(null); setShowForm(true); };
  const openEdit = (o) => { setEditingOffer(o); setAiPrefilled(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingOffer(null); setAiPrefilled(null); };

  const activeCount = offers.filter((o) => o.active).length;
  const archivedCount = offers.filter((o) => !o.active).length;

  const filtered = offers
    .filter((o) => filter === 'active' ? o.active : filter === 'archived' ? !o.active : true)
    .filter((o) => !search || ['titleFr', 'titleEn', 'location', 'tags'].some(k => o[k]?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Barre d'action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
          Gérez les offres publiées sur le site web Tritux.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '9999px', border: 'none', background: 'hsl(var(--foreground))', color: 'hsl(var(--card))', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            <IconPlus /> Nouvelle offre
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'hsl(var(--status-new) / 0.1)', border: '1px solid hsl(var(--status-new) / 0.3)', color: 'hsl(var(--status-new))', fontSize: '0.875rem', fontWeight: 500 }}>{success}</div>}
      {error && <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))', fontSize: '0.875rem' }}>{error}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total', value: offers.length, icon: <IconFileText /> },
          { label: 'Publiées', value: activeCount, icon: <IconCheckCircle /> },
          { label: 'Archivées', value: archivedCount, icon: <IconBox /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="premium-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>{label}</span>
              <span style={{ display: 'flex', color: 'hsl(var(--muted-foreground))' }}>{icon}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '1.75rem', fontWeight: 700, color: 'hsl(var(--foreground))' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtres + Recherche */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'hsl(var(--muted))', borderRadius: '9999px' }}>
          {[{ key: 'all', label: `Toutes (${offers.length})` }, { key: 'active', label: `Publiées (${activeCount})` }, { key: 'archived', label: `Archivées (${archivedCount})` }].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: '6px 14px', borderRadius: '9999px', border: 'none', background: filter === key ? 'hsl(var(--card))' : 'transparent', color: filter === key ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontWeight: filter === key ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer', boxShadow: filter === key ? 'var(--shadow-sm)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par titre, localisation, tag…" style={{ flex: 1, minWidth: '220px', padding: '8px 14px', borderRadius: '9999px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '0.875rem', outline: 'none' }} />
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'hsl(var(--muted-foreground))' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="premium-card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'hsl(var(--muted-foreground))' }}><IconInbox /></div>
          <h3 style={{ margin: '0 0 8px', color: 'hsl(var(--foreground))', fontSize: '1.1rem', fontWeight: 600 }}>
            {search || filter !== 'all' ? 'Aucune offre trouvée' : 'Aucune offre créée'}
          </h3>
          <p style={{ margin: '0 0 20px', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
            {search || filter !== 'all' ? 'Essayez de modifier vos filtres.' : "Créez votre première offre ou utilisez l'assistant IA."}
          </p>
          {!search && filter === 'all' && (
            <button onClick={openCreate} style={{ padding: '9px 22px', borderRadius: '9999px', border: 'none', background: 'hsl(var(--foreground))', color: 'hsl(var(--card))', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              + Créer une offre
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={openEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onNavigate={(id) => navigate(`/offres/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <OfferForm
          initial={editingOffer}
          onSave={handleSave}
          onCancel={closeForm}
          loading={saving}
          aiPrefilled={aiPrefilled}
        />
      )}

      {/* AI Chatbot Bubble */}
      <AIChatbot onOfferGenerated={handleOfferGenerated} />
    </div>
  );
}