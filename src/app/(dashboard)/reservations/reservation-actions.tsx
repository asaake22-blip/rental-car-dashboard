"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReservationCancelDialog } from "./reservation-cancel-dialog";
import type { ReservationRow } from "./columns";

interface ReservationActionsProps {
  reservation: ReservationRow;
}

/**
 * 予約テーブルの行アクション（DropdownMenu）
 */
export function ReservationActions({ reservation }: ReservationActionsProps) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);

  const canCancel = reservation.status === "RESERVED" || reservation.status === "CONFIRMED";

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
          <DropdownMenuItem onSelect={() => router.push(`/reservations/${reservation.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            詳細を表示
          </DropdownMenuItem>
          {canCancel && (
            <>
              <DropdownMenuItem onSelect={() => router.push(`/reservations/${reservation.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setCancelOpen(true)} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                キャンセル
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReservationCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        reservationId={reservation.id}
        reservationCode={reservation.reservationCode}
      />
    </>
  );
}
