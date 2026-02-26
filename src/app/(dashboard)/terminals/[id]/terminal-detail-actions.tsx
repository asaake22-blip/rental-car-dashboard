"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TerminalFormDialog } from "../terminal-form-dialog";
import { TerminalDeleteDialog } from "../terminal-delete-dialog";
import type { TerminalRow } from "../columns";

interface TerminalDetailActionsProps {
  id: string;
  terminalCode: string;
  initialData: {
    terminalName: string;
    terminalType: string;
    provider: string | null;
    modelName: string | null;
    serialNumber: string | null;
    officeId: string;
    officeName: string;
    status: string;
    paymentCount: number;
    note: string | null;
  };
}

export function TerminalDetailActions({
  id,
  terminalCode,
  initialData,
}: TerminalDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // TerminalFormDialog 用に TerminalRow を構成
  const terminalForEdit: TerminalRow = {
    id,
    terminalCode,
    terminalName: initialData.terminalName,
    terminalType: initialData.terminalType,
    provider: initialData.provider,
    officeName: initialData.officeName,
    officeId: initialData.officeId,
    status: initialData.status,
    serialNumber: initialData.serialNumber,
    modelName: initialData.modelName,
    paymentCount: initialData.paymentCount,
    note: initialData.note,
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/terminals")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          決済端末一覧に戻る
        </Button>

        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{terminalCode}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              編集
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              削除
            </Button>
          </div>
        </div>
      </div>

      <TerminalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        terminal={terminalForEdit}
      />
      <TerminalDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        terminalId={id}
        terminalCode={terminalCode}
        redirectToList
      />
    </>
  );
}
