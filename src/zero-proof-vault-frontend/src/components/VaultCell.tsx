
interface VaultCellProps {
  type: "text" | "password";
  value: string;
  onChange: (value: string) => void;
}

export default function VaultCell({ type, value, onChange }: VaultCellProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="vault-cell"
      placeholder=""
    />
  );
}
