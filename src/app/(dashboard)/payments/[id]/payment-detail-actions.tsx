"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentFormDialog } from "../payment-form-dialog";
import { PaymentDeleteDialog } from "../payment-delete-dialog";
import type { PaymentRow } from "../columns";

interface PaymentDetailActionsProps {
  id: string;
  paymentNumber: string;
  externalId: string | null;
  mfBaseUrl: string | null;
  initialData: {
    paymentDate: string;
    amount: number;
    paymentCategory: string;
    paymentProvider: string | null;
    payerName: string;
    terminalId: string | null;
    terminalName: string | null;
    externalId: string | null;
    status: string;
    allocatedTotal: number;
    note: string | null;
  };
}

export function PaymentDetailActions({
  id,
  paymentNumber,
  externalId,
  mfBaseUrl,
  initialData,
}: PaymentDetailActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // PaymentFormDialog 用に PaymentRow を構成
  const paymentForEdit: PaymentRow = {
    id,
    paymentNumber,
    paymentDate: initialData.paymentDate,
    amount: initialData.amount,
    paymentCategory: initialData.paymentCategory,
    paymentProvider: initialData.paymentProvider,
    payerName: initialData.payerName,
    terminalName: initialData.terminalName,
    terminalId: initialData.terminalId,
    externalId: initialData.externalId,
    status: initialData.status,
    allocatedTotal: initialData.allocatedTotal,
    note: initialData.note,
  };

  const mfUrl =
    mfBaseUrl && externalId ? `${mfBaseUrl}${externalId}` : null;

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/payments")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          入金一覧に戻る
        </Button>

        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{paymentNumber}</h1>
          <div className="flex items-center gap-2">
            {externalId && (
              <Button
                variant="outline"
                size="sm"
                asChild={!!mfUrl}
                disabled={!mfUrl}
              >
                {mfUrl ? (
                  <a href={mfUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    MFで開く
                  </a>
                ) : (
                  <>
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    MFで開く
                  </>
                )}
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

      <PaymentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        payment={paymentForEdit}
      />
      <PaymentDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        paymentId={id}
        paymentNumber={paymentNumber}
        redirectToList
      />
    </>
  );
}
