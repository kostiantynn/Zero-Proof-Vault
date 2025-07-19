// pages/ManageVault.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { zero_proof_vault_backend } from "../../../declarations/zero-proof-vault-backend";
import { decryptMetaBlob, decryptPasswordBlob, deriveVaultKey, encryptMetaBlob, encryptPasswordBlob } from "../utility/encdcrpt";
import LoadCSV from "../components/LoadCSV";

export default function ManageVault() {
  const [loading, setLoading] = useState(true);
  const [signedKey, setKey] = useState('');
  const [blobs, setBlobs] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [revealingPassword, setRevealingPassword] = useState(null);
  const [addingEntry, setAddingEntry] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [clearingVault, setClearingVault] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vaultType, setVaultType] = useState('secrets');
  const navigate = useNavigate();
  const location = useLocation();

  const [newEntry, setNewEntry] = useState({ url: "", username: "", password: "" });

  useEffect(() => {
    // Get vault template from navigation state
    if (location.state?.template) {
      setVaultType(location.state.template.id);
    }

    const checkWallet = async () => {
      if (window.solana?.isPhantom || location.state?.localOnly) {
        try {
          const newKey = location.state?.localOnly ? 'local-key' : await deriveVaultKey();
          setKey(newKey);
          
          if (!location.state?.localOnly) {
            const users = await zero_proof_vault_backend.get_all_users();
            const decoded = await Promise.all(
              users.map(async (blob) => {
                try {
                  const { url, username } = await decryptMetaBlob(blob, newKey);
                  return { blob, url, username };
                } catch (e) {
                  console.log("error", e);
                  return { blob, url: "❌ Decryption Error", username: "❌" };
                }
              })
            );
            setBlobs(decoded);
          }
        } catch (error) {
          console.error("Error loading vault:", error);
        }
      } else {
        navigate("/");
        setKey("");
      }
      setLoading(false);
    };
    checkWallet();
  }, [navigate, location.state]);

  const revealPassword = async (blob) => {
    setRevealingPassword(blob);
    try {
      const pw = await zero_proof_vault_backend.get_pw_entry_by_blob(blob);
      const decryptedPass = await decryptPasswordBlob(pw, signedKey);
      setPasswords((prev) => ({ ...prev, [blob]: decryptedPass }));
    } catch (error) {
      console.error("Error revealing password:", error);
    } finally {
      setRevealingPassword(null);
    }
  };

  const hidePassword = (blob) => {
    setPasswords((prev) => {
      const newPasswords = { ...prev };
      delete newPasswords[blob];
      return newPasswords;
    });
  };

  const deleteEntry = async (blob) => {
    setDeletingEntry(blob);
    try {
      const result = await zero_proof_vault_backend.delete_entry_by_blob(blob);
      console.log("delete result", result);
      setBlobs(prev => prev.filter(item => item.blob !== blob));
      setPasswords(prev => {
        const newPasswords = { ...prev };
        delete newPasswords[blob];
        return newPasswords;
      });
    } catch (error) {
      console.error("Error deleting entry:", error);
    } finally {
      setDeletingEntry(null);
    }
  };

  const dropAll = async () => {
    if (!window.confirm("Are you sure you want to clear all entries? This action cannot be undone.")) {
      return;
    }

    setClearingVault(true);
    try {
      const result = await zero_proof_vault_backend.drop_storage();
      console.log("drop result", result);
      setBlobs([]);
      setPasswords({});
    } catch (error) {
      console.error("Error clearing vault:", error);
    } finally {
      setClearingVault(false);
    }
  };

  const handleAdd = async () => {
    if (!newEntry.url || !newEntry.username || !newEntry.password) {
      alert("Please fill in all fields");
      return;
    }

    setAddingEntry(true);
    try {
      const encryptedBlob = await encryptMetaBlob(newEntry.url, newEntry.username, signedKey);
      const encryptedPW = await encryptPasswordBlob(newEntry.password, signedKey);
      await zero_proof_vault_backend.add_entry(encryptedBlob, encryptedPW);
      setBlobs((prev) => [...prev, { blob: encryptedBlob, url: newEntry.url, username: newEntry.username }]);
      setNewEntry({ url: "", username: "", password: "" });
    } catch (error) {
      console.error("Error adding entry:", error);
      alert("Failed to add entry. Please try again.");
    } finally {
      setAddingEntry(false);
    }
  };

  const handleImportEntry = async (entry) => {
    try {
      const encryptedBlob = await encryptMetaBlob(entry.url, entry.username, signedKey);
      const encryptedPW = await encryptPasswordBlob(entry.password, signedKey);
      await zero_proof_vault_backend.add_entry(encryptedBlob, encryptedPW);
      setBlobs((prev) => [...prev, { blob: encryptedBlob, url: entry.url, username: entry.username }]);
    } catch (error) {
      console.error("Error importing entry:", error);
    }
  };

  const handleAllEntries = async (entries) => {
    const encryptedBlobArray = [];
    const forBlobsUpdate = [];
    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const encryptedBlob = await encryptMetaBlob(entry.url, entry.username, signedKey);
        const encryptedPW = await encryptPasswordBlob(entry.password, signedKey);
        encryptedBlobArray.push({ metadata: encryptedBlob, blobdata: encryptedPW });
        forBlobsUpdate.push({blob: encryptedBlob, url: entry.url, username: entry.username});
      }
      console.log(encryptedBlobArray);
      await zero_proof_vault_backend.add_entries_from_array(encryptedBlobArray);
      setBlobs((prev) => [...prev, ...forBlobsUpdate]);
    } catch (error) {
      console.error("Error importing entrys:", error);
      return false;
    }
    return true;
  };

  const filteredBlobs = blobs.filter(({ url, username }) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      url.toLowerCase().includes(searchLower) ||
      username.toLowerCase().includes(searchLower)
    );
  });

  const getVaultIcon = () => {
    switch (vaultType) {
      case 'secrets': return '🔐';
      case 'files': return '📁';
      case 'images': return '🖼️';
      case 'notes': return '📝';
      default: return '🔐';
    }
  };

  const getVaultTitle = () => {
    switch (vaultType) {
      case 'secrets': return 'Secrets Vault';
      case 'files': return 'Files Vault';
      case 'images': return 'Images Vault';
      case 'notes': return 'Notes Vault';
      default: return 'Vault';
    }
  };

  const generateShareLink = () => {
    // Mock functionality for generating share link
    const link = `${window.location.origin}/vault/${Date.now()}`;
    navigator.clipboard.writeText(link);
    alert('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="vault-editor loading-container">
        <div className="loading"></div>
        <p>Loading your vault...</p>
      </div>
    );
  }

  return (
    <div className="vault-editor">
      {/* Vault Header */}
      <div className="vault-header">
        <div className="vault-title-section">
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back
          </button>
          <div className="vault-info">
            <span className="vault-icon">{getVaultIcon()}</span>
            <h1 className="vault-title">{getVaultTitle()}</h1>
          </div>
        </div>
        
        <div className="vault-actions">
          <button className="btn btn-outline" onClick={() => setAddingEntry(true)}>
            ➕ Add Data
          </button>
          <button className="btn btn-secondary" onClick={() => {}}>
            🔒 Encrypt & Save
          </button>
          <button className="btn btn-primary" onClick={generateShareLink}>
            🔗 Generate Share Link
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="editor-container">
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <h3>Search & Filter</h3>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Vault Actions</h3>
            <div className="action-buttons">
              <LoadCSV 
                signedKey={signedKey} 
                setBlobs={setBlobs} 
                handleImportEntry={handleImportEntry}
                handleAllEntries={handleAllEntries}
              />
              <button 
                className="sidebar-action-btn danger" 
                onClick={dropAll}
                disabled={clearingVault}
              >
                {clearingVault ? '🔄' : '🗑️'} Clear All
              </button>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Statistics</h3>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-number">{blobs.length}</span>
                <span className="stat-label">Total Entries</span>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-main">
          {/* Add Entry Form */}
          {addingEntry && (
            <div className="add-entry-form">
              <div className="form-header">
                <h3>➕ Add New Entry</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setAddingEntry(false)}
                >
                  ×
                </button>
              </div>
              <AddEntryForm 
                signedKey={signedKey} 
                setBlobs={setBlobs} 
                setAddingEntry={setAddingEntry}
                vaultType={vaultType}
                handleAdd={handleAdd}
                newEntry={newEntry}
                setNewEntry={setNewEntry}
              />
            </div>
          )}

          {/* Entries List */}
          <div className="entries-container">
            {blobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{getVaultIcon()}</div>
                <h3>Your {getVaultTitle().toLowerCase()} is empty</h3>
                <p>Add your first entry to get started</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setAddingEntry(true)}
                >
                  ➕ Add First Entry
                </button>
              </div>
            ) : (
              <div className="entries-grid">
                {filteredBlobs.map(({ blob, url, username }) => (
                  <EntryCard 
                    key={blob}
                    blob={blob}
                    url={url}
                    username={username}
                    password={passwords[blob]}
                    revealingPassword={revealingPassword === blob}
                    deletingEntry={deletingEntry === blob}
                    onRevealPassword={() => revealPassword(blob)}
                    onHidePassword={() => hidePassword(blob)}
                    onDeleteEntry={() => deleteEntry(blob)}
                    vaultType={vaultType}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Entry Form Component
function AddEntryForm({ signedKey, setBlobs, setAddingEntry, vaultType, handleAdd, newEntry, setNewEntry }) {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await handleAdd();
    } finally {
      setSubmitting(false);
    }
  };

  const getPlaceholders = () => {
    switch (vaultType) {
      case 'files':
        return {
          url: 'File name or path',
          username: 'File description',
          password: 'Access key or content'
        };
      case 'images':
        return {
          url: 'Image name or title',
          username: 'Image description',
          password: 'Access key or metadata'
        };
      case 'notes':
        return {
          url: 'Note title',
          username: 'Category or tags',
          password: 'Note content'
        };
      default:
        return {
          url: 'Website URL',
          username: 'Username or email',
          password: 'Password'
        };
    }
  };

  const placeholders = getPlaceholders();

  return (
    <form onSubmit={onSubmit} className="entry-form">
      <div className="form-group">
        <label>{vaultType === 'secrets' ? 'Website URL' : placeholders.url}</label>
        <input
          type="text"
          value={newEntry.url}
          onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
          placeholder={placeholders.url}
          required
        />
      </div>
      <div className="form-group">
        <label>{vaultType === 'secrets' ? 'Username' : placeholders.username}</label>
        <input
          type="text"
          value={newEntry.username}
          onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
          placeholder={placeholders.username}
          required
        />
      </div>
      <div className="form-group">
        <label>{vaultType === 'secrets' ? 'Password' : placeholders.password}</label>
        {vaultType === 'notes' ? (
          <textarea
            value={newEntry.password}
            onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
            placeholder={placeholders.password}
            required
            rows={5}
          />
        ) : (
          <input
            type="password"
            value={newEntry.password}
            onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
            placeholder={placeholders.password}
            required
          />
        )}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={() => setAddingEntry(false)}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="loading"></span> : '💾 Save Entry'}
        </button>
      </div>
    </form>
  );
}

// Entry Card Component
function EntryCard({ 
  blob, url, username, password, revealingPassword, deletingEntry,
  onRevealPassword, onHidePassword, onDeleteEntry, vaultType 
}) {
  return (
    <div className="entry-card">
      <div className="entry-header">
        <div className="entry-title">
          <span className="entry-icon">
            {vaultType === 'secrets' ? '🌐' : 
             vaultType === 'files' ? '📄' :
             vaultType === 'images' ? '🖼️' : '📝'}
          </span>
          <h4>{url}</h4>
        </div>
        <button 
          className="delete-btn" 
          onClick={onDeleteEntry}
          disabled={deletingEntry}
        >
          {deletingEntry ? <span className="loading"></span> : '🗑️'}
        </button>
      </div>
      
      <div className="entry-content">
        <div className="entry-field">
          <label>{vaultType === 'secrets' ? 'Username' : 'Details'}</label>
          <span>{username}</span>
        </div>
        
        <div className="entry-field">
          <label>{vaultType === 'secrets' ? 'Password' : 'Content'}</label>
          <div className="password-field">
            <input 
              type={password ? "text" : "password"} 
              value={password || ''} 
              readOnly 
              placeholder="Click show to reveal"
            />
            <button 
              className="reveal-btn"
              onClick={password ? onHidePassword : onRevealPassword}
              disabled={revealingPassword}
            >
              {revealingPassword ? (
                <span className="loading"></span>
              ) : password ? (
                '👁️‍🗨️ Hide'
              ) : (
                '👁️ Show'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
