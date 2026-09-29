// frontend/src/components/Wishflow.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './wishflow.module.css';

const Wishflow = () => {
  const [activeTab, setActiveTab] = useState('birthday'); // 'birthday' or 'anniversary'
  const [templates, setTemplates] = useState({ birthday: '', anniversary: '' });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Fetch templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/celebrations');
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
      await axios.put(`http://localhost:5000/api/celebrations/${activeTab}`, {
        messageBody: templates[activeTab]
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving!');
    }
  };

  const handleReset = async () => {
    if(!window.confirm("Are you sure you want to reset to default?")) return;
    try {
      const response = await axios.post(`http://localhost:5000/api/celebrations/reset/${activeTab}`);
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
                  <span className={styles.metaValue} style={{fontWeight: 600}}>
                    {activeTab === 'birthday' 
                      ? 'Birthday Wishes! From Praxsol Engineering Private Limited' 
                      : 'Work Anniversary at Praxsol Engineering Private Limited'}
                  </span>
                </div>
              </div>

              <div className={styles.emailBodyContent}>
                <p>Dear Employee Name,</p>
                
                {/* Fixed Intro Paragraphs based on Red Marks */}
                {activeTab === 'birthday' && (
                  <p>Wishing you a very Happy Birthday from the entire Praxsol team!</p>
                )}
                {activeTab === 'anniversary' && (
                  <>
                    <p>Another year, another milestone! 🥂</p>
                    <p>Happy Work Anniversary at Praxsol Engineering</p>
                  </>
                )}

                {/* Editable Dynamic Body */}
                <div className={styles.dynamicMessage}>
                  {currentMessage.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
                
                <br/>
                
                {/* Fixed Footer based on Red Marks */}
                <p>Warm Regards,</p>
                <p style={{ fontWeight: 'bold' }}>Praxsol Engineering Private Limited</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Wishflow;