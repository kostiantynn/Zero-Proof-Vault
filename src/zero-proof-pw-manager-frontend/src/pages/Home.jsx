// pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const navigate = useNavigate();

  const connectToPhantom = async () => {
    try {
      const provider = window.solana;
      if (!provider?.isPhantom) {
        alert("Phantom Wallet not found");
        return;
      }

      const resp = await provider.connect();
      const address = resp.publicKey.toBase58();
      setWalletAddress(address);
    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  useEffect(() => {
    if (window.solana?.isPhantom && window.solana.isConnected) {
      setWalletAddress(window.solana.publicKey.toBase58());
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Zero-Proof Password Manager</h1>

      {!walletAddress ? (
        <button onClick={connectToPhantom}>Connect to Phantom</button>
      ) : (
        <>
          <p>✅ Connected: {walletAddress}</p>
          <p>You can now close this tab or manage your vault.</p>
           <button onClick={() => navigate("/manage")}>Manage Userpasses</button>
        </>
      )}
    </div>
  );
}
