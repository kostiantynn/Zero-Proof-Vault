// pages/ManageVault.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zero_proof_pw_manager_backend } from "../../../declarations/zero-proof-pw-manager-backend";
import { decryptMetaBlob, decryptPasswordBlob, deriveVaultKey, encryptMetaBlob, encryptPasswordBlob } from "../utility/encdcrpt";
import LoadCSV from "../components/LoadCSV";

export default function ManageVault() {
  const [loading, setLoading] = useState(true);
  const [signedKey, setKey] = useState('');
  const [blobs, setBlobs] = useState([]);
  const [passwords, setPasswords] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const checkWallet = async () => {
      if (window.solana?.isPhantom) {
        const newKey = await deriveVaultKey();
        setKey(newKey);
        const users = await zero_proof_pw_manager_backend.getAllUsers();
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
      } else {
        navigate("/");
        setKey("");
      }
      setLoading(false);
    };
    checkWallet();
  }, []);

  const revealPassword = async (blob) => {
    const pw = await zero_proof_pw_manager_backend.getPWEntryByBlob(blob);
    const decryptedPass = await decryptPasswordBlob(pw, signedKey);
    setPasswords((prev) => ({ ...prev, [blob]: decryptedPass }));
  };

  const deleteEntry = async (blob) => {
    const result = await zero_proof_pw_manager_backend.deleteEntryByBlob(blob);
    console.log("delete result", result);
    blobs.filter((v) => v !== blob);
    setBlobs(blobs);
  };

  const [newEntry, setNewEntry] = useState({ url: "", username: "", password: "" });

  const handleAdd = async () => {
    // Placeholders — you'll replace with actual encryption
    const encryptedBlob = await encryptMetaBlob(newEntry.url, newEntry.username, signedKey);
    const encryptedPW = await encryptPasswordBlob(newEntry.password, signedKey);
    console.log("encryptedBlob", typeof encryptedBlob, encryptedBlob);
    console.log("encryptedPW", typeof encryptedPW, encryptedPW);
    await zero_proof_pw_manager_backend.addEntry(encryptedBlob, encryptedPW);
    setBlobs((prev) => [...prev, { blob: encryptedBlob, url: newEntry.url, username: newEntry.username }]);
    setNewEntry({ url: "", username: "", password: "" });
  };

  const handleImportEntry = async (entry) => {
    // Use the existing handleAdd logic for CSV imported entries
    const encryptedBlob = await encryptMetaBlob(entry.url, entry.username, signedKey);
    const encryptedPW = await encryptPasswordBlob(entry.password, signedKey);
    await zero_proof_pw_manager_backend.addEntry(encryptedBlob, encryptedPW);
    setBlobs((prev) => [...prev, { blob: encryptedBlob, url: entry.url, username: entry.username }]);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Your Vault</h2>

      <LoadCSV onImportEntry={handleImportEntry} />

      <div style={{ marginBottom: 32 }}>
        <h4>Add New Entry</h4>
        <input placeholder="Website" value={newEntry.url} onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })} />
        <input placeholder="Username" value={newEntry.username} onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })} />
        <input placeholder="Password" value={newEntry.password} onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })} />
        <button onClick={handleAdd}>Add</button>
      </div>

      <div>
        {blobs.length === 0 ? <p>No entries found.</p> : (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Encrypted Blob (URL + Username)</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blobs.map(({ blob, url, username }) => (
                <tr key={blob}>
                  <td>{url}</td>
                  <td>{username}</td>
                  <td>{passwords[blob] ?? <button onClick={() => revealPassword(blob)}>Show</button>}</td>
                  <td>
                    <button onClick={() => deleteEntry(blob)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
