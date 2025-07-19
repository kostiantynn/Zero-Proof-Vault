// pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const navigate = useNavigate();

  const connectToPhantom = async () => {
    setIsConnecting(true);
    setErrorMessage('');
    
    try {
      const provider = window.solana;
      if (!provider?.isPhantom) {
        setErrorMessage('Phantom Wallet not found. Please install Phantom Wallet extension.');
        setConnectionStatus('error');
        return;
      }

      const resp = await provider.connect();
      const address = resp.publicKey.toBase58();
      setWalletAddress(address);
      setConnectionStatus('connected');
      
      // Listen for disconnect
      provider.on('disconnect', () => {
        setWalletAddress(null);
        setConnectionStatus('disconnected');
      });
      
    } catch (error) {
      console.error("Connection failed", error);
      setErrorMessage('Failed to connect to Phantom Wallet. Please try again.');
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = window.solana;
      if (provider?.isPhantom) {
        await provider.disconnect();
      }
      setWalletAddress(null);
      setConnectionStatus('disconnected');
      setErrorMessage('');
    } catch (error) {
      console.error("Disconnect failed", error);
    }
  };

  useEffect(() => {
    if (window.solana?.isPhantom && window.solana.isConnected) {
      setWalletAddress(window.solana.publicKey.toBase58());
      setConnectionStatus('connected');
    }
  }, []);

  const templates = [
    {
      id: 'secrets',
      icon: '🔐',
      title: 'Secrets',
      description: 'Store passwords, API keys, and sensitive data'
    },
    {
      id: 'files',
      icon: '📁',
      title: 'Files',
      description: 'Secure document storage and sharing'
    },
    {
      id: 'images',
      icon: '🖼️',
      title: 'Images',
      description: 'Private photo and image vault'
    },
    {
      id: 'notes',
      icon: '📝',
      title: 'Notes',
      description: 'Encrypted personal notes and memos'
    }
  ];

  const createVault = (template = null) => {
    if (walletAddress) {
      navigate("/manage", { state: { template } });
    } else {
      // For demo purposes, still allow creating vault without wallet
      navigate("/manage", { state: { template, localOnly: true } });
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Create a New Vault</h1>
        <p className="hero-subtitle">
          Secure your data with zero-knowledge cryptography
        </p>
        
        <div className="main-actions">
          <button 
            className="btn btn-primary btn-large create-vault-btn"
            onClick={() => createVault()}
          >
            <span className="btn-icon">🔐</span>
            Create a New Vault
          </button>
          
          {!walletAddress && (
            <button 
              className="btn btn-outline connect-wallet-btn" 
              onClick={connectToPhantom}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="loading"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <span className="btn-icon">🔗</span>
                  Connect Wallet to Sync
                </>
              )}
            </button>
          )}
        </div>

        <div className="templates-section">
          <h3 className="templates-title">Quick-start templates</h3>
          <div className="templates-grid">
            {templates.map((template) => (
              <div 
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setTimeout(() => createVault(template), 200);
                }}
              >
                <div className="template-icon">{template.icon}</div>
                <h4 className="template-title">{template.title}</h4>
                <p className="template-description">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {connectionStatus === 'error' && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {walletAddress && (
        <div className="wallet-info">
          <div className="wallet-status">
            <span className="status-indicator connected"></span>
            <span>Wallet Connected</span>
          </div>
          <button 
            className="btn btn-text disconnect-btn" 
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
