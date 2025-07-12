import Time "mo:base/Time";
import HashMap "mo:base/HashMap";

actor {
  type EntryId = Text;
  type WalletAddress = Text;

  type VaultEntry = {
    id: EntryId;
    encryptedBlob: Text; // base64 string
    createdAt: Time.Time;
    updatedAt: Time.Time;
  };

  // Stable store
  stable var vaults: HashMap.HashMap<WalletAddress, [VaultEntry]> = HashMap.empty();

  // Add entry
  public func add_entry(wallet: WalletAddress, entry: VaultEntry): async () {
    let entries = HashMap.get(vaults, wallet);
    let updated = switch (entries) {
      case (null) [entry];
      case (?existing) existing # [entry];
    };
    HashMap.put(vaults, wallet, updated);
  };

  // Get metadata
  public query func get_metadata(wallet: WalletAddress): async [VaultEntry] {
    switch (HashMap.get(vaults, wallet)) {
      case null [];
      case (?entries) Array.map(entries, func(e) {
        { id = e.id; createdAt = e.createdAt; updatedAt = e.updatedAt; encryptedBlob = "" }
      });
    }
  };

  // Get full entry
  public query func get_entry(wallet: WalletAddress, entry_id: EntryId): async ?VaultEntry {
    switch (HashMap.get(vaults, wallet)) {
      case null null;
      case (?entries) Option.find(entries, func(e) { e.id == entry_id });
    }
  };

  // Update entry
  public func update_entry(wallet: WalletAddress, updated: VaultEntry): async () {
    switch (HashMap.get(vaults, wallet)) {
      case null ();
      case (?entries) {
        let result = Array.map(entries, func(e) {
          if (e.id == updated.id) updated else e
        });
        HashMap.put(vaults, wallet, result);
      };
    }
  };

  // Delete entry
  public func delete_entry(wallet: WalletAddress, entry_id: EntryId): async () {
    switch (HashMap.get(vaults, wallet)) {
      case null ();
      case (?entries) {
        let filtered = Array.filter(entries, func(e) { e.id != entry_id });
        HashMap.put(vaults, wallet, filtered);
      };
    }
  };

  // Reset vault (forget all)
  public func reset_vault(wallet: WalletAddress): async () {
    HashMap.delete(vaults, wallet);
  };
};
