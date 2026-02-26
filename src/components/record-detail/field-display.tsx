/**
 * 読み取り専用フィールド表示コンポーネント
 *
 * レコード詳細ページで各フィールドの値を表示する。
 */

interface FieldDisplayProps {
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "date" | "number";
}

export function FieldDisplay({ label, value, type = "text" }: FieldDisplayProps) {
  let displayValue: string;

  if (value === null || value === undefined || value === "") {
    displayValue = "—";
  } else if (type === "date" && typeof value === "string") {
    displayValue = new Date(value).toLocaleDateString("ja-JP");
  } else if (type === "number" && typeof value === "number") {
    displayValue = value.toLocaleString("ja-JP");
  } else {
    displayValue = String(value);
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base">{displayValue}</p>
    </div>
  );
}
