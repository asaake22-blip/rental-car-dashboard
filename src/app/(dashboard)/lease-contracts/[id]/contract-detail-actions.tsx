"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowLeft, Ban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractEditDialog } from "./contract-edit-dialog";
import { ContractDeleteDialog } from "./contract-delete-dialog";
import { AddLineDialog } from "./add-line-dialog";
import { ContractTerminateDialog } from "../contract-terminate-dialog";

interface ContractDetailActionsProps {
  id: string;
  contractNumber: string;
  status: string;
  initialData?: {
    lesseeType: string;
    lesseeName: string;
    lesseeCompanyCode: string | null;
    externalId: string | null;
    startDate: string;
    endDate: string;
    note: string | null;
  };
}

export function ContractDetailActions({
  id,
  contractNumber,
  status,
  initialData,
}: ContractDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/lease-contracts")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          リース契約一覧に戻る
        </Button>

        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{contractNumber}</h1>
          <div className="flex items-center gap-2">
            {status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddLineOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                車両追加
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              編集
            </Button>
            {status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTerminateOpen(true)}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                解約
              </Button>
            )}
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

      <ContractEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contractId={id}
        contractNumber={contractNumber}
        initialData={initialData}
      />
      <ContractDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contractId={id}
        contractNumber={contractNumber}
      />
      <AddLineDialog
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
        contractId={id}
      />
      <ContractTerminateDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        contractId={id}
        contractNumber={contractNumber}
      />
    </>
  );
}
