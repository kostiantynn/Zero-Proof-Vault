import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ManageVault from "./pages/ManageVault";

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    // Check wallet connection status
    if (window.solana?.isPhantom && window.solana.isConnected) {
      setIsWalletConnected(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Router>
      <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-indicator">
            {isWalletConnected ? (
              <>
                <span className="status-icon">🔗</span>
                <span>Synced with your wallet</span>
              </>
            ) : (
              <>
                <span className="status-icon">🧠</span>
                <span>Your session is private</span>
              </>
            )}
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <span className="hamburger">☰</span>
          </button>
        </div>

        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>🔐 Zero-Proof</h3>
            <button className="close-sidebar" onClick={toggleSidebar}>×</button>
          </div>
          
          <div className="sidebar-content">
            <div className="sidebar-section">
              <h4>Recent Vaults</h4>
              <div className="recent-vaults">
                <p className="empty-state">No recent vaults</p>
              </div>
            </div>
            
            <div className="sidebar-section">
              <h4>Actions</h4>
              <button className="sidebar-btn">
                📥 Import Vault Link
              </button>
            </div>
            
            <div className="sidebar-section">
              <h4>Settings</h4>
              <button className="sidebar-btn theme-toggle" onClick={toggleTheme}>
                {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/manage" element={<ManageVault />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}