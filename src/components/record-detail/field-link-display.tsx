/**
 * リンク付きフィールド表示コンポーネント
 *
 * Salesforce の参照項目のように、関連レコードの名前をクリックで
 * 詳細画面に遷移できるリンクとして表示する。
 */

import Link from "next/link";

interface FieldLinkDisplayProps {
  label: string;
  value: string | null | undefined;
  href: string | null | undefined;
}

export function FieldLinkDisplay({ label, value, href }: FieldLinkDisplayProps) {
  const displayValue = value ?? "—";

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {value && href ? (
        <Link
          href={href}
          className="text-base text-link hover:text-link-hover active:text-link-active hover:underline font-medium"
        >
          {displayValue}
        </Link>
      ) : (
        <p className="text-base">{displayValue}</p>
      )}
    </div>
  );
}
