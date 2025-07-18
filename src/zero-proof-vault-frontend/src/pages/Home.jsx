// pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
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

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Successfully connected to Phantom Wallet!';
      case 'error':
        return errorMessage;
      default:
        return 'Connect your Phantom Wallet to get started';
    }
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      default:
        return '';
    }
  };

  return (
    <div className="flex-center flex-column">
      <div className="card text-center">
        <h1>🔐 Zero-Proof Password Manager</h1>
        <p className="mb-30">
          Secure your passwords with zero-knowledge cryptography on the Internet Computer
        </p>

        {!walletAddress ? (
          <div className="phantom-wallet-connect">
            <h2>Connect Your Wallet</h2>
            <p className="mb-30">
              Connect your Phantom Wallet to access your secure password vault
            </p>
            
            <button 
              className="btn" 
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
                  <span className="wallet-icon"></span>
                  Connect Phantom Wallet
                </>
              )}
            </button>

            <div className="connection-status">
              <div className={`status-indicator ${connectionStatus}`}></div>
              <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>

            <div className={`status-message ${getStatusClass()}`}>
              {getStatusMessage()}
            </div>
          </div>
        ) : (
          <div className="phantom-wallet-connect">
            <h2>✅ Wallet Connected</h2>
            <p className="mb-20">
              Your Phantom Wallet is successfully connected
            </p>
            
            <div className="status-message success mb-30">
              <strong>Connected Address:</strong><br />
              <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                {walletAddress}
              </code>
            </div>

            <div className="flex-center gap-20">
              <button 
                className="btn" 
                onClick={() => navigate("/manage")}
              >
                🔐 Manage Passwords
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={disconnectWallet}
              >
                Disconnect Wallet
              </button>
            </div>

            <div className="connection-status">
              <div className="status-indicator connected"></div>
              <span>Connected</span>
            </div>
          </div>
        )}
      </div>

      {walletAddress && (
        <div className="card mt-30" style={{ maxWidth: '800px' }}>
          <h3>🚀 Ready to Get Started?</h3>
          <p>
            Your wallet is connected and ready. You can now:
          </p>
          <ul style={{ textAlign: 'left', marginTop: '20px' }}>
            <li>🔐 Store passwords securely with zero-knowledge proofs</li>
            <li>🔒 Access your vault from anywhere</li>
            <li>🛡️ Benefit from blockchain-level security</li>
            <li>⚡ Fast and decentralized password management</li>
          </ul>
        </div>
      )}
    </div>
  );
}
