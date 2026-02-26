"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "./account-form-dialog";

/**
 * 取引先一覧ヘッダー（タイトル + 新規作成ボタン）
 */
export function AccountsHeader() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">取引先</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <AccountFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
