// Home.tsx (Refactored to use identity system)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentitySystem } from "../utility/identity";

export default function Home() {
  const navigate = useNavigate();
  const {
    currentProfile,
    currentVault,
    createVault,
    listVaults,
    switchVault,
  } = useIdentitySystem();

  const [vaults, setVaults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVaultID, setSelectedVaultID] = useState<string | null>(null);

  useEffect(() => {
    const loadVaults = async () => {
      try {
        const v = await listVaults();
        setVaults(v);
        if (v.length > 0) {
          setSelectedVaultID(v[0].vaultID);
        }
      } catch (err) {
        console.error("Failed to load vaults", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadVaults();
  }, [listVaults]);

  const handleCreateVault = async () => {
    const newVault = await createVault("My First Vault");
    await switchVault(newVault);
    navigate("/manage");
  };

  const handleAccessVault = async () => {
    const vault = vaults.find(v => v.vaultID === selectedVaultID);
    if (!vault) return;
    await switchVault(vault);
    navigate("/manage");
  };

  return (
    <div className="flex-center flex-column">
      <div className="card text-center">
        <h1>🔐 Zero-Proof Vault Manager</h1>
        <p className="mb-30">
          Secure your passwords with zero-knowledge cryptography on the Internet Computer
        </p>

        {isLoading ? (
          <p>Loading...</p>
        ) : currentProfile ? (
          <>
            <div className="status-message success mb-20">
              <strong>Active Profile:</strong><br />
              <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                {currentProfile.icpPublicKey}
              </code>
            </div>

            {vaults.length === 0 ? (
              <>
                <p>You have no vaults yet.</p>
                <button className="btn" onClick={handleCreateVault}>
                  ➕ Create New Vault
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">🗂️ Select Vault</label>
                  <select
                    className="form-input"
                    value={selectedVaultID || ""}
                    onChange={(e) => setSelectedVaultID(e.target.value)}
                  >
                    {vaults.map((v) => (
                      <option key={v.vaultID} value={v.vaultID}>
                        {v.nickname}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn" onClick={handleAccessVault}>
                  🔐 Access Vault
                </button>
                <button className="btn" onClick={handleCreateVault}>
                  ➕ Create New Vault
                </button>
              </>
            )}
          </>
        ) : (
          <p>Initializing profile...</p>
        )}
      </div>
    </div>
  );
}
