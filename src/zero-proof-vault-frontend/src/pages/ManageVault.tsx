// ManageVault.tsx (Updated to use identity system securely)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentitySystem } from "../utility/identity";
import { zero_proof_vault_backend } from "../../../declarations/zero-proof-vault-backend";
import {
  decryptMetaBlob,
  decryptPasswordBlob,
  encryptMetaBlob,
  encryptPasswordBlob,
} from "../utility/crypto/encdcrpt";
// import LoadCSV from "../components/CSV/LoadCSV";

export default function ManageVault() {
  const navigate = useNavigate();
  const { currentProfile, currentVault } = useIdentitySystem();

  const [signedKey, setKey] = useState<Uint8Array | null>(null);
  const [blobs, setBlobs] = useState<Array<{ blob: string; url: string; username: string }>>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [clearingVault, setClearingVault] = useState(false);
  const [revealingPassword, setRevealingPassword] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ url: "", username: "", password: "" });

  useEffect(() => {
    const loadVaultData = async () => {
      if (!currentProfile || !currentProfile.icpAccount || !currentVault) {
        navigate("/");
        return;
      }

      try {
        const identity = currentProfile.icpAccount.identity;
        const signature = await identity.sign(new TextEncoder().encode(currentVault.vaultID));
        const keyMaterial = await crypto.subtle.digest("SHA-256", signature);
        const derivedKey = new Uint8Array(keyMaterial).slice(0, 32);

        setKey(derivedKey);

        const users = await zero_proof_vault_backend.get_all_users();
        const decoded = await Promise.all(
          users.map(async (blob) => {
            try {
              const { url, username } = await decryptMetaBlob(blob, derivedKey);
              return { blob, url, username };
            } catch (e) {
              return { blob, url: "❌ Decryption Error", username: "❌" };
            }
          })
        );
        setBlobs(decoded);
      } catch (error) {
        console.error("Error loading vault:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVaultData();
  }, [currentProfile, currentVault, navigate]);

  const revealPassword = async (blob: string) => {
    setRevealingPassword(blob);
    try {
      const pw = await (zero_proof_vault_backend.get_pw_entry_by_blob(blob) as unknown as Promise<string>);
      const decryptedPass = await decryptPasswordBlob(pw, signedKey!);
      setPasswords((prev) => ({ ...prev, [blob]: decryptedPass }));
    } catch (error) {
      console.error("Error revealing password:", error);
    } finally {
      setRevealingPassword(null);
    }
  };

  const hidePassword = (blob: string) => {
    setPasswords((prev) => {
      const newPasswords = { ...prev };
      delete newPasswords[blob];
      return newPasswords;
    });
  };

  const deleteEntry = async (blob: string) => {
    setDeletingEntry(blob);
    try {
      await zero_proof_vault_backend.delete_entry_by_blob(blob);
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
    if (!window.confirm("Are you sure you want to clear all entries? This action cannot be undone.")) return;

    setClearingVault(true);
    try {
      await zero_proof_vault_backend.drop_storage();
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
      const encryptedBlob = await encryptMetaBlob(newEntry.url, newEntry.username, signedKey!);
      const encryptedPW = await encryptPasswordBlob(newEntry.password, signedKey!);
      await zero_proof_vault_backend.add_entry(encryptedBlob, encryptedPW);
      setBlobs(prev => [...prev, { blob: encryptedBlob, url: newEntry.url, username: newEntry.username }]);
      setNewEntry({ url: "", username: "", password: "" });
    } catch (error) {
      console.error("Error adding entry:", error);
      alert("Failed to add entry. Please try again.");
    } finally {
      setAddingEntry(false);
    }
  };

  const handleImportEntry = async (entry: { url: string; username: string; password: string }) => {
    try {
      const encryptedBlob = await encryptMetaBlob(entry.url, entry.username, signedKey!);
      const encryptedPW = await encryptPasswordBlob(entry.password, signedKey!);
      await zero_proof_vault_backend.add_entry(encryptedBlob, encryptedPW);
      setBlobs(prev => [...prev, { blob: encryptedBlob, url: entry.url, username: entry.username }]);
    } catch (error) {
      console.error("Error importing entry:", error);
    }
  };

  const handleAllEntries = async (entries: Array<{ url: string; username: string; password: string }>) => {
    const encryptedBlobArray: Array<{ metadata: string; blobdata: string }> = [];
    const forBlobsUpdate: Array<{ blob: string; url: string; username: string }> = [];
    try {
      for (const entry of entries) {
        const encryptedBlob = await encryptMetaBlob(entry.url, entry.username, signedKey!);
        const encryptedPW = await encryptPasswordBlob(entry.password, signedKey!);
        encryptedBlobArray.push({ metadata: encryptedBlob, blobdata: encryptedPW });
        forBlobsUpdate.push({ blob: encryptedBlob, url: entry.url, username: entry.username });
      }
      await zero_proof_vault_backend.add_entries_from_array(encryptedBlobArray);
      setBlobs(prev => [...prev, ...forBlobsUpdate]);
    } catch (error) {
      console.error("Error importing entries:", error);
    }
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

  return (
    <div className="flex-center flex-column">
      <div className="card" style={{ maxWidth: '1400px', width: '100%' }}>
        {/* Include your existing layout JSX here */}
      </div>
    </div>
  );
}
