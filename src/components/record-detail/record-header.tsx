"use client";

/**
 * レコード詳細ページのヘッダー
 *
 * タイトル + 承認ステータスバッジ + アクションボタン群を表示。
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const statusLabel: Record<string, string> = {
  PENDING: "未承認",
  APPROVED: "承認済",
  REJECTED: "却下",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

export interface HeaderAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: () => void;
  show?: boolean;
}

interface RecordHeaderProps {
  title: string;
  subtitle?: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  backHref: string;
  backLabel?: string;
  actions?: HeaderAction[];
}

export function RecordHeader({
  title,
  subtitle,
  approvalStatus,
  backHref,
  backLabel = "一覧に戻る",
  actions = [],
}: RecordHeaderProps) {
  const router = useRouter();
  const visibleActions = actions.filter((a) => a.show !== false);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(backHref)}
        className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            <Badge variant={statusVariant[approvalStatus] ?? "outline"}>
              {statusLabel[approvalStatus] ?? approvalStatus}
            </Badge>
          </div>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>

        {visibleActions.length > 0 && (
          <div className="flex items-center gap-2">
            {visibleActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant ?? "outline"}
                size="sm"
                onClick={action.onClick}
              >
                {action.icon && <action.icon className="mr-1.5 h-4 w-4" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
