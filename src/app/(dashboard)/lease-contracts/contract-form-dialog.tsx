"use client";

import { useTransition, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/crud/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { createLeaseContract, updateLeaseContract } from "@/app/actions/lease-contract";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions/types";
import type { ContractRow } from "./columns";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: ContractRow;
}

/** 明細行の型 */
interface LineInput {
  key: number; // React key 用
  vehicleId: string;
  startDate: string;
  endDate: string;
  monthlyAmount: string;
}

const lesseeTypeOptions = [
  { value: "INDIVIDUAL", label: "個人" },
  { value: "CORPORATE", label: "法人" },
] as const;

let lineKeyCounter = 0;

function createEmptyLine(): LineInput {
  return {
    key: ++lineKeyCounter,
    vehicleId: "",
    startDate: "",
    endDate: "",
    monthlyAmount: "",
  };
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
}: ContractFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lesseeType, setLesseeType] = useState<string>(
    contract?.lesseeType ?? "INDIVIDUAL"
  );
  const [lines, setLines] = useState<LineInput[]>([createEmptyLine()]);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!contract;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setFieldErrors({});
        setErrorMessage(null);
        setLesseeType(contract?.lesseeType ?? "INDIVIDUAL");
        if (!isEdit) {
          setLines([createEmptyLine()]);
        }
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, contract, isEdit]
  );

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine()]);
  };

  const removeLine = (key: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev; // 最低1行
      return prev.filter((l) => l.key !== key);
    });
  };

  const updateLine = (key: number, field: keyof LineInput, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    // 明細データを FormData に追加
    formData.set("lineCount", String(lines.length));
    lines.forEach((line, index) => {
      formData.set(`lines[${index}].vehicleId`, line.vehicleId);
      formData.set(`lines[${index}].startDate`, line.startDate);
      formData.set(`lines[${index}].endDate`, line.endDate);
      formData.set(`lines[${index}].monthlyAmount`, line.monthlyAmount);
    });

    startTransition(async () => {
      let result: ActionResult;
      if (isEdit && contract) {
        result = await updateLeaseContract(contract.id, formData);
      } else {
        result = await createLeaseContract(formData);
      }

      if (result.success) {
        toast.success(
          isEdit ? "リース契約を更新しました" : "リース契約を作成しました"
        );
        handleOpenChange(false);
        formRef.current?.reset();
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "リース契約を編集" : "リース契約を作成"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "リース契約の内容を変更します。"
              : "新しいリース契約を登録します。"}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
            {errorMessage}
          </div>
        )}

        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {/* 契約ヘッダー */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              契約情報
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                name="lesseeType"
                label="区分"
                type="select"
                required
                defaultValue={contract?.lesseeType ?? "INDIVIDUAL"}
                options={[...lesseeTypeOptions]}
                fieldErrors={fieldErrors.lesseeType}
                disabled={isPending}
                onValueChange={(_name, value) => setLesseeType(value)}
              />
              <FormField
                name="lesseeName"
                label="リース先名称"
                type="text"
                required
                defaultValue={contract?.lesseeName ?? ""}
                fieldErrors={fieldErrors.lesseeName}
                disabled={isPending}
              />
              {lesseeType === "CORPORATE" && (
                <FormField
                  name="lesseeCompanyCode"
                  label="会社コード"
                  type="text"
                  defaultValue={contract?.lesseeCompanyCode ?? ""}
                  fieldErrors={fieldErrors.lesseeCompanyCode}
                  disabled={isPending}
                />
              )}
              <FormField
                name="externalId"
                label="外部ID"
                type="text"
                defaultValue={contract?.externalId ?? ""}
                fieldErrors={fieldErrors.externalId}
                disabled={isPending}
              />
              <FormField
                name="startDate"
                label="契約開始日"
                type="date"
                required
                defaultValue={
                  contract?.startDate
                    ? contract.startDate.split("T")[0]
                    : ""
                }
                fieldErrors={fieldErrors.startDate}
                disabled={isPending}
              />
              <FormField
                name="endDate"
                label="契約終了日"
                type="date"
                required
                defaultValue={
                  contract?.endDate
                    ? contract.endDate.split("T")[0]
                    : ""
                }
                fieldErrors={fieldErrors.endDate}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="note">備考</Label>
              <Textarea
                id="note"
                name="note"
                defaultValue={contract?.note ?? ""}
                disabled={isPending}
              />
              {fieldErrors.note && (
                <p className="text-destructive text-xs">
                  {fieldErrors.note[0]}
                </p>
              )}
            </div>
          </div>

          {/* 契約明細（車両） - 新規作成時のみ */}
          {!isEdit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  契約明細（車両）
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  disabled={isPending}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  車両を追加
                </Button>
              </div>

              {fieldErrors.lines && (
                <p className="text-destructive text-xs">
                  {fieldErrors.lines[0]}
                </p>
              )}

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="rounded-md border p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        明細 {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(line.key)}
                        disabled={isPending || lines.length <= 1}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label>
                          車両ID
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                          value={line.vehicleId}
                          onChange={(e) =>
                            updateLine(line.key, "vehicleId", e.target.value)
                          }
                          disabled={isPending}
                          placeholder="車両IDを入力"
                        />
                        {fieldErrors[`lines[${index}].vehicleId`] && (
                          <p className="text-destructive text-xs">
                            {fieldErrors[`lines[${index}].vehicleId`][0]}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label>
                          月額
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                          type="number"
                          value={line.monthlyAmount}
                          onChange={(e) =>
                            updateLine(
                              line.key,
                              "monthlyAmount",
                              e.target.value
                            )
                          }
                          disabled={isPending}
                          placeholder="月額リース料"
                        />
                        {fieldErrors[`lines[${index}].monthlyAmount`] && (
                          <p className="text-destructive text-xs">
                            {fieldErrors[`lines[${index}].monthlyAmount`][0]}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label>
                          開始日
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={line.startDate}
                          onChange={(e) =>
                            updateLine(line.key, "startDate", e.target.value)
                          }
                          disabled={isPending}
                        />
                        {fieldErrors[`lines[${index}].startDate`] && (
                          <p className="text-destructive text-xs">
                            {fieldErrors[`lines[${index}].startDate`][0]}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label>
                          終了日
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={line.endDate}
                          onChange={(e) =>
                            updateLine(line.key, "endDate", e.target.value)
                          }
                          disabled={isPending}
                        />
                        {fieldErrors[`lines[${index}].endDate`] && (
                          <p className="text-destructive text-xs">
                            {fieldErrors[`lines[${index}].endDate`][0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : isEdit ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
