"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContractFormDialog } from "./contract-form-dialog";
import { ContractTerminateDialog } from "./contract-terminate-dialog";
import type { ContractRow } from "./columns";

interface ContractActionsProps {
  contract: ContractRow;
}

export function ContractActions({ contract }: ContractActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">メニューを開く</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => router.push(`/lease-contracts/${contract.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            詳細を表示
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </DropdownMenuItem>
          {contract.status === "ACTIVE" && (
            <DropdownMenuItem
              onSelect={() => setTerminateOpen(true)}
              className="text-destructive"
            >
              <Ban className="mr-2 h-4 w-4" />
              解約
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contract={contract}
      />
      <ContractTerminateDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        contractId={contract.id}
        contractNumber={contract.contractNumber}
      />
    </>
  );
}
