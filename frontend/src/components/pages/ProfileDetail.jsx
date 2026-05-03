import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import keycloak from '../../keycloak';

// ── Editable Block ──────────────────────────────────────────────────────────
function Block({ label, value, onDelete, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const save = () => { onChange(val); setEditing(false); };
  return (
    <div
      className="block-item"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '8px',
        background: 'hsl(var(--muted) / 0.5)',
        border: '1px solid hsl(var(--border) / 0.6)',
        borderRadius: '12px', padding: '8px 12px',
        transition: 'box-shadow 0.2s', position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {editing ? (
        <>
          <input
            style={{
              flex: 1, fontSize: '0.8125rem',
              borderBottom: '1px solid hsl(var(--primary))',
              outline: 'none', background: 'transparent',
              color: 'hsl(var(--foreground))',
            }}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
          <button onClick={save} style={{ color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>✓</button>
          <button onClick={() => setEditing(false)} style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            {label && <p style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', margin: '0 0 2px' }}>{label}</p>}
            <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--foreground))', fontWeight: 500, margin: 0 }}>{value}</p>
          </div>
          <div className="block-actions" style={{  gap: '4px' }}>
            <button onClick={() => setEditing(true)} style={{ color: 'hsl(var(--primary))', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '2px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button onClick={onDelete} style={{ color: 'hsl(var(--destructive))', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '2px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{
        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'hsl(var(--muted-foreground))',
        margin: '0 0 8px',
      }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{children}</div>
    </div>
  );
}

// ── VoiceButton ───────────────────────────────────────────────────────────────
function VoiceButton({ onTranscribedAudio, disabled }) {
  const [recording, setRecording] = useState(false);
  const [ripple, setRipple] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        onTranscribedAudio(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRipple(true);
      setTimeout(() => setRipple(false), 600);
    } catch (err) {
      console.error('Microphone inaccessible:', err);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <button
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled}
      title={recording ? 'Arrêter l\'enregistrement' : 'Enregistrer un message vocal'}
      style={{
        position: 'relative',
        width: '38px', height: '38px',
        borderRadius: '12px',
        border: recording ? '2px solid hsl(var(--destructive))' : '1px solid hsl(var(--border))',
        background: recording ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--muted))',
        color: recording ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {recording ? <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/></svg> : <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'/><path d='M19 10v2a7 7 0 0 1-14 0v-2'/><line x1='12' y1='19' x2='12' y2='23'/><line x1='8' y1='23' x2='16' y2='23'/></svg>}
      {recording && (
        <span style={{
          position: 'absolute', inset: 0,
          borderRadius: '12px',
          border: '2px solid hsl(var(--destructive))',
          animation: 'pulse-ring 1.2s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [profile, setProfile] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);

  const chatEndRef = useRef(null);

  useEffect(() => {
    api.get(`/candidates/${id}`).then(r => {
      setCandidate(r.data);
      setProfile(r.data.profileData || {});
    });
  }, [id]);

  // Chargement PDF avec token JWT
  useEffect(() => {
    if (!candidate?.cvOriginalPath) return;
    let blobUrl = null;
    const loadPdf = async () => {
      setPdfLoading(true);
      try {
        const res = await fetch(`http://localhost:9091/api/candidates/${id}/cv-preview`, {
          headers: { Authorization: `Bearer ${keycloak.token}` },
        });
        if (!res.ok) throw new Error('Erreur chargement CV');
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(blobUrl);
      } catch (e) {
        console.error(e);
      } finally {
        setPdfLoading(false);
      }
    };
    loadPdf();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [candidate, id]);

  // Auto-scroll vers le bas du chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, sending]);

  const saveProfile = async (updatedProfile) => {
    setSaving(true);
    try { await api.put(`/candidates/${id}/profile`, updatedProfile); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    saveProfile(updated);
  };

  const removeFromArray = (field, index) => {
    const arr = [...(profile[field] || [])];
    arr.splice(index, 1);
    updateField(field, arr);
  };

  const updateInArray = (field, index, value) => {
    const arr = [...(profile[field] || [])];
    arr[index] = typeof arr[index] === 'object' ? { ...arr[index], ...value } : value;
    updateField(field, arr);
  };

  // ── Envoi message texte ─────────────────────────────────────────────────
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || sending) return;
    setChatInput('');
    appendUserMsg(msg);
    await callChatApi(msg);
  };

  // ── Envoi message vocal ─────────────────────────────────────────────────
  const sendAudio = async (audioBlob) => {
    if (sending) return;

    // Afficher un message indicatif pendant la transcription
    appendUserMsg('Message vocal envoyé…');
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      // currentProfile n'est pas envoyé ici : Spring Boot l'injecte depuis la DB

      const res = await api.post(`/candidates/${id}/chat-audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { reply, updatedProfile, transcribedMessage } = res.data;

      // Remplacer le message "vocal envoyé" par la transcription réelle
      if (transcribedMessage) {
        setChat(prev => {
          const updated = [...prev];
          // Remplacer le dernier message user par la transcription
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === 'user') {
              updated[i] = { ...updated[i], text: `"${transcribedMessage}"` };
              break;
            }
          }
          return updated;
        });
      }

      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      appendAssistantMsg(reply);
    } catch {
      appendAssistantMsg("Erreur lors du traitement du message vocal.");
    } finally {
      setSending(false);
    }
  };

  // ── Helpers chat ────────────────────────────────────────────────────────
  const appendUserMsg = (text) => setChat(prev => [...prev, { role: 'user', text }]);
  const appendAssistantMsg = (text) => setChat(prev => [...prev, { role: 'assistant', text }]);

  const callChatApi = async (message) => {
    setSending(true);
    try {
      // On n'envoie plus currentProfile : Spring Boot le récupère depuis la DB
      const res = await api.post(`/candidates/${id}/chat`, { message });
      const { reply, updatedProfile } = res.data;
      if (updatedProfile) setProfile(updatedProfile);
      appendAssistantMsg(reply);
    } catch {
      appendAssistantMsg("Erreur de communication avec l'assistant IA.");
    } finally {
      setSending(false);
    }
  };

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid hsl(var(--primary))',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '-8px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '0 0 20px',
        borderBottom: '1px solid hsl(var(--border) / 0.5)',
        marginBottom: '20px',
      }}>
        <button
          onClick={() => navigate('/profiles')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '9999px',
            border: '1px solid hsl(var(--border))',
            background: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '0.8125rem', cursor: 'pointer',
          }}
        >
          ← Retour
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'hsl(var(--primary) / 0.12)',
            color: 'hsl(var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1rem',
          }}>
            {candidate?.nom?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
              {candidate?.nom}
            </h1>
            {profile.title && (
              <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>{profile.title}</p>
            )}
          </div>
        </div>

        {saving && (
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
            Sauvegarde…
          </span>
        )}

        <button
          onClick={() => navigate(`/transformation?id=${id}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', borderRadius: '9999px',
            border: 'none',
            background: 'hsl(var(--primary))',
            color: 'white',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Transformer le CV
        </button>
      </div>

      {/* 3-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '16px',
        height: 'calc(130vh - 260px)',
        minHeight: '500px',
      }}>

        {/* Colonne 1 : CV Original */}
        <div className="premium-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
            fontSize: '0.6875rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'hsl(var(--muted-foreground))',
            background: 'hsl(var(--muted) / 0.4)',
          }}>
            CV Original
          </div>
          <div style={{ flex: 1, padding: '12px' }}>
            {candidate?.cvOriginalPath ? (
              pdfLoading
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--muted-foreground))' }}>Chargement…</div>
                : <iframe
                    src={pdfBlobUrl}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                    title="CV Preview"
                  />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'hsl(var(--muted-foreground))' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
                  <p style={{ fontSize: '0.8125rem', margin: 0 }}>Aperçu non disponible</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne 2 : Profil éditable */}
        <div className="premium-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
            fontSize: '0.6875rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'hsl(var(--muted-foreground))',
            background: 'hsl(var(--muted) / 0.4)',
          }}>
            Informations extraites
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            <Section title="Identité">
              <Block label="Nom complet" value={profile.nom_candidat || ''}
                onChange={v => updateField('nom_candidat', v)}
                onDelete={() => updateField('nom_candidat', '')} />
              <Block label="Titre" value={profile.title || ''}
                onChange={v => updateField('title', v)}
                onDelete={() => updateField('title', '')} />
              {profile.experience_years && (
                <Block label="Années d'exp." value={`${profile.experience_years} ans`}
                  onChange={v => updateField('experience_years', parseInt(v))}
                  onDelete={() => updateField('experience_years', null)} />
              )}
            </Section>

            <Section title="Compétences Techniques">
              {(profile.skills || []).map((skill, i) => (
                <Block key={i} value={skill}
                  onChange={v => updateInArray('skills', i, v)}
                  onDelete={() => removeFromArray('skills', i)} />
              ))}
            </Section>

            <Section title="Compétences Spécifiques">
              {(profile.specific_skills || []).map((s, i) => (
                <Block key={i} value={s}
                  onChange={v => updateInArray('specific_skills', i, v)}
                  onDelete={() => removeFromArray('specific_skills', i)} />
              ))}
            </Section>

            <Section title="Langues">
              {(profile.languages || []).map((l, i) => (
                <Block key={i} label={l.name} value={l.level}
                  onChange={v => updateInArray('languages', i, { ...l, level: v })}
                  onDelete={() => removeFromArray('languages', i)} />
              ))}
            </Section>

            <Section title="Formation">
              {(profile.education || []).map((e, i) => (
                <Block key={i}
                  label={`${e.year || ''} — ${e.school}`}
                  value={e.degree}
                  onChange={v => updateInArray('education', i, { ...e, degree: v })}
                  onDelete={() => removeFromArray('education', i)} />
              ))}
            </Section>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: 'hsl(var(--muted-foreground))',
                margin: '0 0 8px',
              }}>Expériences</h3>
              {(profile.experiences || []).map((exp, i) => (
                <div key={i} style={{
                  background: 'hsl(var(--muted) / 0.5)',
                  border: '1px solid hsl(var(--border) / 0.6)',
                  borderRadius: '12px', padding: '12px',
                  marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>{exp.company}</p>
                    <button
                      onClick={() => removeFromArray('experiences', i)}
                      style={{ color: 'hsl(var(--destructive))', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                    ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', margin: '0 0 2px' }}>{exp.position}</p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: '0 0 4px' }}>
                    {exp.start_date} — {exp.end_date || 'présent'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--foreground))', margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {exp.description}
                  </p>
                  {exp.tech_stack && (
                    <p style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Tech : {exp.tech_stack}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne 3 : Assistant IA */}
        <div className="premium-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Header colonne */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid hsl(var(--border) / 0.5)',
            fontSize: '0.6875rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'hsl(var(--muted-foreground))',
            background: 'hsl(var(--muted) / 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Assistant IA</span>
            <span style={{
              fontSize: '0.625rem', fontWeight: 500,
              background: 'hsl(var(--primary) / 0.1)',
              color: 'hsl(var(--primary))',
              padding: '2px 8px', borderRadius: '9999px',
              letterSpacing: '0.05em',
            }}>
              Groq · llama-3.3-70b
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chat.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: '32px', color: 'hsl(var(--muted-foreground))' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'hsl(var(--muted-foreground))' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                <p style={{ fontSize: '0.8125rem', margin: '0 0 4px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                  Posez une question ou demandez une modification
                </p>
                <p style={{ fontSize: '0.75rem', margin: '0 0 16px', color: 'hsl(var(--muted-foreground))' }}>
                  Texte ou vocal
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Corrige le nom avec un accent : é',
                    'Reformule les expériences en français plus souple',
                    'Ajoute Docker dans les compétences',
                    'Rends ce CV anonyme',
                    'Traduis la description en anglais',
                  ].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setChatInput(hint)}
                      style={{
                        textAlign: 'left', fontSize: '0.75rem',
                        background: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px', padding: '8px 12px',
                        color: 'hsl(var(--foreground))',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chat.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'hsl(var(--primary) / 0.12)',
                    color: 'hsl(var(--primary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', marginRight: '6px', flexShrink: 0, marginTop: '2px',
                  }}><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg></div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '8px 12px', borderRadius: '14px',
                  fontSize: '0.8125rem', lineHeight: 1.55,
                  background: msg.role === 'user' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  color: msg.role === 'user' ? 'white' : 'hsl(var(--foreground))',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '14px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '14px',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'hsl(var(--primary) / 0.12)',
                  color: 'hsl(var(--primary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', flexShrink: 0,
                }}><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg></div>
                <div style={{
                  padding: '8px 14px', borderRadius: '14px', borderBottomLeftRadius: '4px',
                  background: 'hsl(var(--muted))',
                  display: 'flex', gap: '4px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'hsl(var(--muted-foreground))',
                      display: 'inline-block',
                      animation: `bounce 1.2s ease infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Zone de saisie */}
          <div style={{ padding: '12px', borderTop: '1px solid hsl(var(--border) / 0.5)' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>

              {/* Bouton vocal */}
              <VoiceButton onTranscribedAudio={sendAudio} disabled={sending} />

              {/* Input texte */}
              <input
                style={{
                  flex: 1, padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                  fontSize: '0.8125rem', outline: 'none',
                }}
                placeholder="Demandez une modification…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
              />

              {/* Bouton envoyer */}
              <button
                onClick={sendChat}
                disabled={sending || !chatInput.trim()}
                style={{
                  width: '38px', height: '38px',
                  borderRadius: '12px', border: 'none',
                  background: sending || !chatInput.trim() ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                  color: sending || !chatInput.trim() ? 'hsl(var(--muted-foreground))' : 'white',
                  fontSize: '1rem', cursor: sending || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .block-item:hover .block-actions { display: flex !important; }
      `}</style>
    </div>
  );
}