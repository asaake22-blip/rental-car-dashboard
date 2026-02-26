"use client";

/**
 * 予約詳細ページのアクション（ヘッダー + ダイアログ群）
 *
 * ステータスに応じてアクションボタンを表示:
 * - RESERVED: 編集、キャンセル、車両割当
 * - CONFIRMED: 編集、キャンセル、割当解除、出発処理（Phase 9E）
 * - DEPARTED: 帰着処理（Phase 9F）
 * - RETURNED: 精算（Phase 9F）
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, XCircle, Truck, CarFront, Undo2, MapPin, Receipt, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReservationCancelDialog } from "../reservation-cancel-dialog";
import { AssignVehicleDialog } from "./assign-vehicle-dialog";
import { DepartDialog } from "./depart-dialog";
import { ReturnDialog } from "./return-dialog";
import { SettleDialog } from "./settle-dialog";
import { PrintAgreementButton } from "./print-agreement-button";
import { unassignVehicle } from "@/app/actions/reservation";
import { toast } from "sonner";
import { useTransition } from "react";

const statusLabels: Record<string, string> = {
  RESERVED: "予約",
  CONFIRMED: "配車済",
  DEPARTED: "出発中",
  RETURNED: "帰着",
  SETTLED: "精算済",
  CANCELLED: "キャンセル",
  NO_SHOW: "ノーショー",
};

const statusColors: Record<string, string> = {
  RESERVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CONFIRMED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  DEPARTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  RETURNED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  SETTLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  NO_SHOW: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

interface ReservationDetailActionsProps {
  id: string;
  reservationCode: string;
  status: string;
  vehicleId: string | null;
  vehicleClassId: string;
  vehicleMileage: number;
  pickupDate: string;
  returnDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicleCode: string;
  vehicleName: string;
  plateNumber: string | null;
  vehicleClassName: string;
  pickupOfficeName: string;
  returnOfficeName: string;
  estimatedAmount: number | null;
  actualPickupDate: string;
  departureOdometer: number;
  note: string | null;
}

export function ReservationDetailActions({
  id,
  reservationCode,
  status,
  vehicleId,
  vehicleClassId,
  vehicleMileage,
  pickupDate,
  returnDate,
  customerName,
  customerPhone,
  customerEmail,
  vehicleCode,
  vehicleName,
  plateNumber,
  vehicleClassName,
  pickupOfficeName,
  returnOfficeName,
  estimatedAmount,
  actualPickupDate,
  departureOdometer,
  note,
}: ReservationDetailActionsProps) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [departOpen, setDepartOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [isUnassigning, startUnassignTransition] = useTransition();

  const handleUnassign = () => {
    startUnassignTransition(async () => {
      const result = await unassignVehicle(id);
      if (result.success) {
        toast.success("車両割当を解除しました");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/reservations")}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          予約一覧に戻る
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{reservationCode}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status] ?? ""}`}
              >
                {statusLabels[status] ?? status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* RESERVED: 編集、キャンセル、車両割当 */}
            {status === "RESERVED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/reservations/${id}/edit`)}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  編集
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAssignOpen(true)}
                >
                  <CarFront className="mr-1.5 h-4 w-4" />
                  車両割当
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  キャンセル
                </Button>
              </>
            )}

            {/* CONFIRMED: 編集、キャンセル、割当解除、出発処理 */}
            {status === "CONFIRMED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/reservations/${id}/edit`)}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassign}
                  disabled={isUnassigning}
                >
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  {isUnassigning ? "解除中..." : "割当解除"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setDepartOpen(true)}
                >
                  <Truck className="mr-1.5 h-4 w-4" />
                  出発処理
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  キャンセル
                </Button>
              </>
            )}

            {/* DEPARTED: 帰着処理 + 貸渡証PDF */}
            {status === "DEPARTED" && (
              <>
                <PrintAgreementButton
                  data={{
                    reservationCode,
                    customerName,
                    customerPhone,
                    customerEmail,
                    vehicleCode,
                    vehicleName,
                    plateNumber,
                    vehicleClassName,
                    pickupOfficeName,
                    returnOfficeName,
                    pickupDate,
                    returnDate,
                    actualPickupDate,
                    departureOdometer,
                    estimatedAmount,
                    note,
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setReturnOpen(true)}
                >
                  <MapPin className="mr-1.5 h-4 w-4" />
                  帰着処理
                </Button>
              </>
            )}

            {/* RETURNED: 精算 + 貸渡証PDF */}
            {status === "RETURNED" && (
              <>
                <PrintAgreementButton
                  data={{
                    reservationCode,
                    customerName,
                    customerPhone,
                    customerEmail,
                    vehicleCode,
                    vehicleName,
                    plateNumber,
                    vehicleClassName,
                    pickupOfficeName,
                    returnOfficeName,
                    pickupDate,
                    returnDate,
                    actualPickupDate,
                    departureOdometer,
                    estimatedAmount,
                    note,
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSettleOpen(true)}
                >
                  <Receipt className="mr-1.5 h-4 w-4" />
                  精算
                </Button>
              </>
            )}

            {/* SETTLED: 貸渡証PDF のみ */}
            {status === "SETTLED" && (
              <PrintAgreementButton
                data={{
                  reservationCode,
                  customerName,
                  customerPhone,
                  customerEmail,
                  vehicleCode,
                  vehicleName,
                  plateNumber,
                  vehicleClassName,
                  pickupOfficeName,
                  returnOfficeName,
                  pickupDate,
                  returnDate,
                  actualPickupDate,
                  departureOdometer,
                  estimatedAmount,
                  note,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* キャンセルダイアログ */}
      <ReservationCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        reservationId={id}
        reservationCode={reservationCode}
      />

      {/* 車両割当ダイアログ */}
      <AssignVehicleDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        reservationId={id}
        vehicleClassId={vehicleClassId}
      />

      {/* 出発処理ダイアログ */}
      <DepartDialog
        open={departOpen}
        onOpenChange={setDepartOpen}
        reservationId={id}
        reservationCode={reservationCode}
        vehicleMileage={vehicleMileage}
      />

      {/* 帰着処理ダイアログ */}
      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        reservationId={id}
        reservationCode={reservationCode}
        departureOdometer={departureOdometer}
      />

      {/* 精算ダイアログ */}
      <SettleDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        reservationId={id}
        reservationCode={reservationCode}
        estimatedAmount={estimatedAmount}
      />
    </>
  );
}
