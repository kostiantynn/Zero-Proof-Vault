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

  const [newEntry, setNewEntry] = useState({ url: "", username: "", password: "" });

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

  if (loading) {
    return (
      <div className="flex-center flex-column">
        <div className="card text-center">
          <div className="loading" style={{ width: '40px', height: '40px', margin: '20px auto' }}></div>
          <h3>Loading Your Vault...</h3>
          <p>Please wait while we securely load your password entries.</p>
        </div>
      </div>
    );
  }

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
    <div className="flex-center flex-column">
      <div className="card" style={{ maxWidth: '1400px', width: '100%' }}>
        {/* Header Section */}
        <div className="flex-between mb-30">
          <h1>🔐 Password Vault</h1>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>

        {/* Main Grid Layout */}
        <div className="grid" style={{ 
          gridTemplateColumns: '1fr 1fr', 
          gap: '30px'
        }}>
          
          {/* Left Column - Add Entry & Import */}
          <div className="flex flex-column">
            {/* Combined Add Entry & Import Section */}
                  <div className="card">
                    <h3>➕ Add New Entry</h3>
                    <div className="form-group">
                    <label className="form-label">Website URL</label>
                    <input 
                      className="form-input" 
                      placeholder="https://example.com" 
                      value={newEntry.url} 
                      onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })} 
                    />
                    </div>
                    <div className="form-group">
                    <label className="form-label">Username</label>
                    <input 
                      className="form-input" 
                      placeholder="your@email.com" 
                      value={newEntry.username} 
                      onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })} 
                    />
                    </div>
                    <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="flex gap-10 flex-mobile-column">
                      <input 
                      className="form-input" 
                      type="password" 
                      placeholder="Enter password" 
                      value={newEntry.password} 
                      onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })} 
                      />
                      <button 
                      className="btn btn-secondary" 
                      style={{ 
                        padding: '12px 16px', 
                        minWidth: 'auto'
                      }}
                      onClick={() => {
                        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
                        const randomPassword = Array.from({length: 16}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                        setNewEntry({ ...newEntry, password: randomPassword });
                      }}
                      >
                      <div className="flex gap-5 flex-column" style={{ alignItems: 'center' }}>
                        <span role="img" aria-label="dice">🎲</span>
                        Generate
                      </div>
                      </button>
                    </div>
                    </div>
                    <button 
                    className="btn" 
                    onClick={handleAdd}
                    disabled={addingEntry}
                    >
                    {addingEntry ? (
                      <>
                      <span className="loading"></span>
                      Adding...
                      </>
                    ) : (
                      'Add Entry'
                    )}
                    </button>

                    <hr style={{ 
                    margin: '30px 0', 
                    border: 'none', 
                    height: '1px', 
                    background: 'var(--card-border)' 
                    }} />

                    <h3>📁 Import from CSV</h3>
                    <p className="mb-20">
                    Import your passwords from a CSV file
                    </p>
                    <LoadCSV onImportEntries={handleAllEntries} onImportEntry={handleImportEntry} />
                  </div>
                  </div>

                  {/* Right Column - Password List */}
          <div className="flex flex-column">
            {/* Search and Actions Header */}
            <div className="card mb-20" style={{ marginBottom: '30px' }}>
              <div className="flex-between mb-20 flex-mobile-column">
                <h3>🔒 Your Passwords ({blobs.length})</h3>
                {blobs.length > 0 && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={dropAll}
                    disabled={clearingVault}
                  >
                    {clearingVault ? (
                      <>
                        <span className="loading"></span>
                        Clearing...
                      </>
                    ) : (
                      '🗑️ Clear All'
                    )}
                  </button>
                )}
              </div>

              {/* Search Bar */}
              {blobs.length > 0 && (
                <div className="form-group">
                  <label className="form-label">🔍 Search Passwords</label>
                  <input 
                    className="form-input" 
                    placeholder="Search by website URL or username..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                  {searchTerm && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      Found {filteredBlobs.length} of {blobs.length} entries
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Password Entries Grid */}
            {blobs.length === 0 ? (
              <div className="card text-center">
                <p>No password entries found.</p>
                <p>Add your first entry above to get started!</p>
              </div>
            ) : filteredBlobs.length === 0 && searchTerm ? (
              <div className="card text-center">
                <p>No entries match your search: "{searchTerm}"</p>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSearchTerm('')}
                  style={{ marginTop: '10px' }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-2 gap-20 grid-mobile-single">
                {filteredBlobs.map(({ blob, url, username }) => (
                  <div key={blob} className="card" style={{ padding: '20px', position: 'relative' }}>
                    <div className="flex-between mb-10 flex-mobile-column">
                      <div style={{ flex: 1, marginRight: '10px' }}>
                        <h4 style={{ margin: 0 }} className="text-mobile-break">🌐 {url}</h4>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '12px',
                          flexShrink: 0,
                          minWidth: 'fit-content'
                        }}
                        onClick={() => deleteEntry(blob)}
                        disabled={deletingEntry === blob}
                      >
                        {deletingEntry === blob ? (
                          <span className="loading"></span>
                        ) : (
                          '🗑️ Delete'
                        )}
                      </button>
                    </div>
                    <p className="text-mobile-break"><strong>👤 Username:</strong> {username}</p>
                    <div className="form-group">
                      <label className="form-label">🔑 Password</label>
                      <div className="flex gap-10 flex-mobile-column">
                        <input 
                          className="form-input" 
                          type={passwords[blob] ? "text" : "password"} 
                          value={passwords[blob] || ''} 
                          readOnly 
                          placeholder="Click 'Show' to reveal"
                        />
                        <button 
                          className="btn btn-mobile-full" 
                          style={{ 
                            padding: '12px 16px', 
                            minWidth: 'auto'
                          }}
                          onClick={() => passwords[blob] ? hidePassword(blob) : revealPassword(blob)}
                          disabled={revealingPassword === blob}
                        >
                          {revealingPassword === blob ? (
                            <span className="loading"></span>
                          ) : passwords[blob] ? (
                            '👁️ Hide'
                          ) : (
                            '👁️ Show'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
