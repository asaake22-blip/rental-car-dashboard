"use client";

/**
 * 予約編集フォーム
 *
 * RESERVED / CONFIRMED ステータスの予約を編集するフルページフォーム。
 */

import { useTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/crud/form-field";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { updateReservation } from "@/app/actions/reservation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface ReservationEditFormProps {
  reservation: {
    id: string;
    reservationCode: string;
    vehicleClassId: string;
    customerName: string;
    customerNameKana: string;
    customerPhone: string;
    customerEmail: string | null;
    pickupDate: string;
    returnDate: string;
    pickupOfficeId: string;
    returnOfficeId: string;
    estimatedAmount: number | null;
    note: string | null;
    customerCode?: string | null;
    entityType?: number | null;
    companyCode?: string | null;
    channel?: string | null;
  };
  vehicleClasses: { id: string; className: string }[];
  offices: { id: string; officeName: string }[];
}

/** datetime-local input 用のフォーマット（YYYY-MM-DDTHH:mm） */
function toDatetimeLocalValue(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ReservationEditForm({
  reservation,
  vehicleClasses,
  offices,
}: ReservationEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateReservation(reservation.id, formData);

      if (result.success) {
        toast.success("予約を更新しました");
        router.push(`/reservations/${reservation.id}`);
      } else {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        if (result.error) {
          setErrorMessage(result.error);
          toast.error(result.error);
        }
      }
    });
  };

  const vehicleClassOptions = vehicleClasses.map((vc) => ({
    value: vc.id,
    label: vc.className,
  }));

  const officeOptions = offices.map((o) => ({
    value: o.id,
    label: o.officeName,
  }));

  return (
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "予約一覧", href: "/reservations" },
          { label: reservation.reservationCode, href: `/reservations/${reservation.id}` },
          { label: "編集" },
        ]}
      />

      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/reservations/${reservation.id}`)}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          詳細に戻る
        </Button>

        <h1 className="text-2xl font-bold">予約を編集: {reservation.reservationCode}</h1>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      )}

      <form ref={formRef} action={handleSubmit}>
        <div className="space-y-6">
          {/* 車両クラス */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">車両クラス</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                name="vehicleClassId"
                label="車両クラス"
                type="select"
                required
                options={vehicleClassOptions}
                defaultValue={reservation.vehicleClassId}
                fieldErrors={fieldErrors.vehicleClassId}
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">顧客情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="customerName"
                  label="顧客名"
                  type="text"
                  required
                  defaultValue={reservation.customerName}
                  fieldErrors={fieldErrors.customerName}
                  disabled={isPending}
                />
                <FormField
                  name="customerNameKana"
                  label="顧客名（カナ）"
                  type="text"
                  required
                  defaultValue={reservation.customerNameKana}
                  fieldErrors={fieldErrors.customerNameKana}
                  disabled={isPending}
                />
                <FormField
                  name="customerPhone"
                  label="電話番号"
                  type="text"
                  required
                  defaultValue={reservation.customerPhone}
                  fieldErrors={fieldErrors.customerPhone}
                  disabled={isPending}
                />
                <FormField
                  name="customerEmail"
                  label="メールアドレス"
                  type="text"
                  defaultValue={reservation.customerEmail ?? ""}
                  fieldErrors={fieldErrors.customerEmail}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* 顧客区分・コード情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">顧客区分・コード</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="customerCode"
                  label="顧客コード"
                  type="text"
                  defaultValue={reservation.customerCode ?? ""}
                  fieldErrors={fieldErrors.customerCode}
                  disabled={isPending}
                />
                <FormField
                  name="entityType"
                  label="個人/法人区分"
                  type="select"
                  options={[
                    { value: "__none__", label: "未選択" },
                    { value: "1", label: "個人" },
                    { value: "2", label: "法人" },
                  ]}
                  defaultValue={reservation.entityType != null ? String(reservation.entityType) : "__none__"}
                  fieldErrors={fieldErrors.entityType}
                  disabled={isPending}
                />
                <FormField
                  name="companyCode"
                  label="法人コード"
                  type="text"
                  defaultValue={reservation.companyCode ?? ""}
                  fieldErrors={fieldErrors.companyCode}
                  disabled={isPending}
                />
                <FormField
                  name="channel"
                  label="販売チャネル"
                  type="text"
                  defaultValue={reservation.channel ?? ""}
                  fieldErrors={fieldErrors.channel}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* 日時・営業所 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">貸出情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="pickupDate">
                    出発日時
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="pickupDate"
                    name="pickupDate"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(reservation.pickupDate)}
                    disabled={isPending}
                  />
                  {fieldErrors.pickupDate && fieldErrors.pickupDate.length > 0 && (
                    <p className="text-destructive text-xs">{fieldErrors.pickupDate[0]}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="returnDate">
                    帰着日時
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="returnDate"
                    name="returnDate"
                    type="datetime-local"
                    required
                    defaultValue={toDatetimeLocalValue(reservation.returnDate)}
                    disabled={isPending}
                  />
                  {fieldErrors.returnDate && fieldErrors.returnDate.length > 0 && (
                    <p className="text-destructive text-xs">{fieldErrors.returnDate[0]}</p>
                  )}
                </div>
                <FormField
                  name="pickupOfficeId"
                  label="出発営業所"
                  type="select"
                  required
                  options={officeOptions}
                  defaultValue={reservation.pickupOfficeId}
                  fieldErrors={fieldErrors.pickupOfficeId}
                  disabled={isPending}
                />
                <FormField
                  name="returnOfficeId"
                  label="帰着営業所"
                  type="select"
                  required
                  options={officeOptions}
                  defaultValue={reservation.returnOfficeId}
                  fieldErrors={fieldErrors.returnOfficeId}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* 金額・備考 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">金額・備考</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <FormField
                  name="estimatedAmount"
                  label="見積金額"
                  type="number"
                  defaultValue={reservation.estimatedAmount ?? ""}
                  fieldErrors={fieldErrors.estimatedAmount}
                  disabled={isPending}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="note">備考</Label>
                  <Textarea
                    id="note"
                    name="note"
                    defaultValue={reservation.note ?? ""}
                    disabled={isPending}
                    rows={3}
                    placeholder="備考（任意）"
                  />
                  {fieldErrors.note && fieldErrors.note.length > 0 && (
                    <p className="text-destructive text-xs">{fieldErrors.note[0]}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 送信ボタン */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/reservations/${reservation.id}`)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "更新"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
