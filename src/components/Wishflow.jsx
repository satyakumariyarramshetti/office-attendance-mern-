// frontend/src/components/Wishflow.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './wishflow.module.css';
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Wishflow = () => {

  const [activeTab, setActiveTab] = useState('birthday'); // 'birthday' or 'anniversary'
  const [templates, setTemplates] = useState({ birthday: '', anniversary: '' });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [recipients, setRecipients] = useState([]);

  // Fetch templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Live preview: fetch rendered email HTML from backend (debounced)
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(async () => {
      try {
        const res = await axios.post( `${API_BASE}/api/celebrations/preview`, {
          type: activeTab,
          messageBody: templates[activeTab],
        });
        setPreviewHtml(res.data.html);
      } catch (error) {
  console.error('Error loading preview', error);
  setPreviewHtml(`<p style="font-family:Arial;padding:20px;color:#b91c1c;">Preview does not load: ${error.message}. Please restart</p>`);
}
    }, 400);
    return () => clearTimeout(timer);
  }, [activeTab, templates, loading]);

  useEffect(() => {
  const fetchRecipients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/celebrations/recipients?days=7`);
      setRecipients(res.data);
    } catch (error) {
      console.error('Error fetching recipients', error);
    }
  };
  fetchRecipients();
}, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/celebrations`);
      const data = response.data;
      const bday = data.find(t => t.type === 'birthday')?.messageBody || '';
      const anniv = data.find(t => t.type === 'anniversary')?.messageBody || '';
      setTemplates({ birthday: bday, anniversary: anniv });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching templates", error);
    }
  };

  const handleTextChange = (e) => {
    setTemplates({ ...templates, [activeTab]: e.target.value });
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      await axios.put(`{API_BASE}/api/celebrations/${activeTab}`, {
        messageBody: templates[activeTab]
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving!');
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset to default?")) return;
    try {
      const response = await axios.post(`${API_BASE}/api/celebrations/reset/${activeTab}`);
      setTemplates({ ...templates, [activeTab]: response.data.template.messageBody });
    } catch (error) {
      console.error("Error resetting template", error);
    }
  };

  if (loading) return <div className={styles.loader}>Loading...</div>;

  const currentMessage = templates[activeTab];

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIcon}>🎁</div>
        <div>
          <h1 className={styles.pageTitle}>Celebrations Management</h1>
          <p className={styles.pageSubtitle}>Manage and customize employee celebration messages</p>
        </div>
      </div>

      <div className={styles.mainGrid}>

        {/* Left Column - Controls */}
        <div className={styles.leftColumn}>

{/* Upcoming Recipients */}
<div className={styles.sectionCard}>
  <h2 className={styles.sectionTitle}>Upcoming Recipients</h2>
  <p className={styles.sectionSubtitle}>
    Wishes are sent automatically every day at 9:00 AM (IST) to these employees.
  </p>

  {recipients.length === 0 ? (
    <p className={styles.sectionSubtitle}>No birthdays or anniversaries in the next 7 days.</p>
  ) : (
    recipients.map((day) => (
      <div key={day.date} style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          {day.daysFromNow === 0
            ? 'Today'
            : day.daysFromNow === 1
            ? 'Tomorrow'
            : new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>

        {day.birthdays.map((p) => (
          <div key={p.email + 'b'} style={{ fontSize: 14, padding: '4px 0' }}>
            🎂 <b>{p.name}</b> <span style={{ color: '#64748b' }}>({p.email})</span> - Birthday
          </div>
        ))}

        {day.anniversaries.map((p) => (
          <div key={p.email + 'a'} style={{ fontSize: 14, padding: '4px 0' }}>
            🎉 <b>{p.name}</b> <span style={{ color: '#64748b' }}>({p.email})</span> - {p.years}{' '}
            {p.years === 1 ? 'year' : 'years'} Work Anniversary
          </div>
        ))}
      </div>
    ))
  )}
</div>

          {/* Select Celebration Type */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Select Celebration Type</h2>
            <p className={styles.sectionSubtitle}>Choose the type of celebration for which you want to edit the message.</p>

            <div className={styles.tabContainer}>
              <div
                className={`${styles.tabCard} ${activeTab === 'birthday' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('birthday')}
              >
                <div className={styles.tabIcon}>🎂</div>
                <div className={styles.tabText}>
                  <h4>Birthday</h4>
                  <p>Send birthday wishes to employees</p>
                </div>
                {activeTab === 'birthday' && <div className={styles.checkIcon}>✔</div>}
              </div>

              <div
                className={`${styles.tabCard} ${activeTab === 'anniversary' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('anniversary')}
              >
                <div className={styles.tabIcon}>🎉</div>
                <div className={styles.tabText}>
                  <h4>Work Anniversary</h4>
                  <p>Celebrate work anniversaries</p>
                </div>
                {activeTab === 'anniversary' && <div className={styles.checkIcon}>✔</div>}
              </div>
            </div>
          </div>

          {/* Edit Message Body */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Edit Message Body</h2>
            <p className={styles.sectionSubtitle}>You can only edit the message body. The greeting, intro, and signature will be added automatically.</p>

            <div className={styles.editorContainer}>
              <textarea
                className={styles.textArea}
                value={currentMessage}
                onChange={handleTextChange}
                rows={10}
              />
            </div>

            <div className={styles.infoAlert}>
              <span className={styles.infoIcon}>ℹ️</span>
              <p>Dear <b>[Employee Name]</b>, the intro line, and the company signature are fixed and will be added automatically.</p>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.resetBtn} onClick={handleReset}>
                ↺ Reset to Default
              </button>
              <div className={styles.saveContainer}>
                <span className={styles.saveStatus}>{saveStatus}</span>
                <button className={styles.saveBtn} onClick={handleSave}>
                  💾 Save Message
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Preview */}
        <div className={styles.rightColumn}>
          <div className={styles.sectionCard} style={{ height: '100%' }}>
            <div className={styles.previewHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Email Preview</h2>
                <p className={styles.sectionSubtitle}>Here's how the final email will look.</p>
              </div>
            </div>

            <div className={styles.emailPreviewBox}>
              <div className={styles.emailWindowControls}>
                <span className={styles.dot} style={{ backgroundColor: '#ff5f56' }}></span>
                <span className={styles.dot} style={{ backgroundColor: '#ffbd2e' }}></span>
                <span className={styles.dot} style={{ backgroundColor: '#27c93f' }}></span>
              </div>

              <div className={styles.emailMetadata}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>From:</span>
                  <span className={styles.metaValue}>Praxsol Engineering &lt;no-reply@praxsol.com&gt;</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>To:</span>
                  <span className={styles.metaValue}>Name&lt;employee@company.com&gt;</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Subject:</span>
                  <span className={styles.metaValue} style={{ fontWeight: 600 }}>
                    {activeTab === 'birthday'
                      ? 'Birthday Wishes! From Praxsol Engineering Private Limited'
                      : 'Work Anniversary at Praxsol Engineering Private Limited'}
                  </span>
                </div>
              </div>

              {/* Real email HTML rendered by backend (same template used for sending) */}
              <iframe
                title="Email Preview"
                className={styles.previewFrame}
                srcDoc={previewHtml}
                sandbox=""
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Wishflow;