import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Array "mo:base/Array";

actor {

  var vaultMap = HashMap.HashMap<Text.Text, Text.Text>(10, Text.equal, Text.hash);

  public query func greet(name : Text.Text) : async Text.Text {
    return "Hello, " # name # "!";
  };

  // Add or update an entry
  public func addEntry(encryptedBlob: Text.Text, encryptedPWBlob: Text.Text) : async () {
    vaultMap.put(encryptedBlob, encryptedPWBlob)
  };

  public query func getPWEntryByBlob(encryptedBlob: Text.Text) : async ?Text.Text {
    return vaultMap.get(encryptedBlob);
  };

  public query func getAllUsers() : async [Text.Text] {
    let iter = vaultMap.keys();
    return Iter.toArray(iter);
  };

  public func deleteEntryByBlob(encryptedBlob: Text.Text) : async () {
    ignore vaultMap.remove(encryptedBlob);
  };

  public func dropStorage() : async () {
    let keys = Iter.toArray(vaultMap.keys());
    for (key in keys.vals()) {
      ignore vaultMap.remove(key);
    };
  };
};
