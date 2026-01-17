import { Input } from "@/shared/ui/input";

export function AllCardsSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-6">
      <Input
        type="text"
        placeholder="Search cards..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
