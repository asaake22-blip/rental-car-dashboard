"use client";

/**
 * RecordActionBar - Salesforce風レコード詳細ページのアクションバー
 *
 * ヘッダー部分（戻るボタン + タイトル + ステータスバッジ）と
 * アクションエリア（主要アクション + 二次アクション + 破壊的アクション）を提供する。
 */

import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface Action {
  key: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "destructive";
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
}

export interface RecordActionBarProps {
  /** レコードコード（例: INV-00001） */
  title: string;
  /** レコード名（例: 取引先名） */
  subtitle?: string;
  /** ステータスバッジ */
  statusBadge?: { label: string; color: string };
  /** 戻るリンク先 */
  backHref: string;
  /** 戻るボタンのラベル（デフォルト: "一覧に戻る"） */
  backLabel?: string;
  /** 主要アクション（最大3個、横並び表示） */
  primaryActions: Action[];
  /** 二次アクション（DropdownMenu内に表示） */
  secondaryActions?: Action[];
  /** 破壊的アクション（削除等、最右端に配置） */
  destructiveAction?: Action;
}

// ---------------------------------------------------------------------------
// 内部ヘルパー: アクションボタン
// ---------------------------------------------------------------------------

function ActionButton({ action }: { action: Action }) {
  const Icon = action.icon;
  return (
    <Button
      variant={action.variant ?? "outline"}
      size="sm"
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
    >
      {action.loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      <span className="hidden md:inline">{action.label}</span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

export function RecordActionBar({
  title,
  subtitle,
  statusBadge,
  backHref,
  backLabel = "一覧に戻る",
  primaryActions,
  secondaryActions,
  destructiveAction,
}: RecordActionBarProps) {
  const router = useRouter();

  // hidden でないアクションだけ抽出
  const visiblePrimary = primaryActions.filter((a) => !a.hidden);
  const visibleSecondary = (secondaryActions ?? []).filter((a) => !a.hidden);

  // レスポンシブ: モバイルでは主要アクション2個まで表示、3個目以降をドロップダウンに移動
  const mobilePrimary = visiblePrimary.slice(0, 2);
  const mobileOverflow = visiblePrimary.slice(2);

  // ドロップダウンに表示するアクション群を構築
  // デスクトップ: secondaryActions のみ
  // モバイル: mobileOverflow + secondaryActions
  const hasDesktopDropdown = visibleSecondary.length > 0;
  const hasMobileDropdown = mobileOverflow.length > 0 || visibleSecondary.length > 0;
  const showDestructive = destructiveAction && !destructiveAction.hidden;

  return (
    <div className="space-y-4">
      {/* 戻るボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(backHref)}
        className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>

      {/* タイトル + アクション */}
      <div className="flex items-start justify-between">
        {/* 左側: タイトル + ステータスバッジ + サブタイトル */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            {statusBadge && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${statusBadge.color}20`,
                  color: statusBadge.color,
                }}
              >
                {statusBadge.label}
              </span>
            )}
          </div>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>

        {/* 右側: アクションエリア */}
        <div className="flex items-center gap-2">
          {/* --- デスクトップ表示: 全 primaryActions + secondaryActions ドロップダウン --- */}
          {/* 主要アクション（デスクトップ: 全て表示） */}
          {visiblePrimary.map((action) => (
            <div key={action.key} className="hidden md:block">
              <ActionButton action={action} />
            </div>
          ))}

          {/* 主要アクション（モバイル: 先頭2個のみ） */}
          {mobilePrimary.map((action) => (
            <div key={`mobile-${action.key}`} className="md:hidden">
              <ActionButton action={action} />
            </div>
          ))}

          {/* 二次アクション DropdownMenu（デスクトップ） */}
          {hasDesktopDropdown && (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label="その他のアクション">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {visibleSecondary.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.key}
                        onSelect={action.onClick}
                        disabled={action.disabled || action.loading}
                        variant={action.variant === "destructive" ? "destructive" : "default"}
                      >
                        {action.loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          Icon && <Icon className="mr-2 h-4 w-4" />
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 二次アクション DropdownMenu（モバイル: overflow + secondary） */}
          {hasMobileDropdown && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" aria-label="その他のアクション">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mobileOverflow.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.key}
                        onSelect={action.onClick}
                        disabled={action.disabled || action.loading}
                        variant={action.variant === "destructive" ? "destructive" : "default"}
                      >
                        {action.loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          Icon && <Icon className="mr-2 h-4 w-4" />
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                  {mobileOverflow.length > 0 && visibleSecondary.length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  {visibleSecondary.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.key}
                        onSelect={action.onClick}
                        disabled={action.disabled || action.loading}
                        variant={action.variant === "destructive" ? "destructive" : "default"}
                      >
                        {action.loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          Icon && <Icon className="mr-2 h-4 w-4" />
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 破壊的アクション（最右端） */}
          {showDestructive && (
            <ActionButton
              action={{ ...destructiveAction!, variant: "destructive" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
