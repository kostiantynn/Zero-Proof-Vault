// components/LoadCSV.jsx
import React, { useState } from "react";

export default function LoadCSV({ onImportEntry }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Find column indices
    const urlIndex = headers.findIndex(h => h.includes('url') || h.includes('website') || h.includes('site'));
    const usernameIndex = headers.findIndex(h => h.includes('username') || h.includes('user') || h.includes('email'));
    const passwordIndex = headers.findIndex(h => h.includes('password') || h.includes('pass'));
    
    if (urlIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
      throw new Error("CSV must contain columns for URL, username, and password");
    }
    
    const entries = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        if (values.length >= Math.max(urlIndex, usernameIndex, passwordIndex) + 1) {
          entries.push({
            url: values[urlIndex],
            username: values[usernameIndex],
            password: values[passwordIndex]
          });
        }
      }
    }
    
    return entries;
  };

  const handleImport = async () => {
    if (!file) {
      alert("Please select a CSV file first");
      return;
    }

    setIsProcessing(true);
    
    try {
      const csvText = await file.text();
      const entries = parseCSV(csvText);
      
      setProgress({ current: 0, total: entries.length });
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setProgress({ current: i + 1, total: entries.length });
        
        // Call the handleAdd function from ManageVault for each entry
        await onImportEntry(entry);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      alert(`Successfully imported ${entries.length} entries!`);
      setFile(null);
      
    } catch (error) {
      console.error("Import error:", error);
      alert("Error importing CSV: " + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Progress popup overlay
  if (isProcessing) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h3>Importing CSV Entries...</h3>
          <p style={{ fontSize: '24px', margin: '16px 0' }}>
            {progress.current}/{progress.total}
          </p>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#4CAF50',
              width: `${(progress.current / progress.total) * 100}%`,
              transition: 'width 0.3s ease'
            }}></div>
          </div>
          <p style={{ marginTop: '16px', color: '#666' }}>
            Processing entry {progress.current} of {progress.total}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <h4>Import from CSV</h4>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: 16 }}>
        CSV should contain columns for URL/Website, Username, and Password
      </p>
      
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ flex: 1 }}
        />
        <button 
          onClick={handleImport}
          disabled={!file}
          style={{
            padding: '8px 16px',
            backgroundColor: file ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file ? 'pointer' : 'not-allowed'
          }}
        >
          Import CSV
        </button>
      </div>
      
      {file && (
        <p style={{ marginTop: 8, fontSize: '14px', color: '#666' }}>
          Selected: {file.name}
        </p>
      )}
    </div>
  );
}
