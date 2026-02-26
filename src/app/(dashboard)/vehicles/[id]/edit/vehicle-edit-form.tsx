"use client";

import { useTransition, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/crud/form-field";
import { RecordBreadcrumbs } from "@/components/record-detail/record-breadcrumbs";
import { vehicleFormFields } from "@/lib/validations/vehicle";
import { updateVehicle } from "@/app/actions/vehicle";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import type { VehicleRow } from "../../columns";

interface VehicleEditFormProps {
  vehicle: VehicleRow;
}

export function VehicleEditForm({ vehicle }: VehicleEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const initialValues = useRef<Record<string, string>>(
    Object.fromEntries(
      vehicleFormFields.map((field) => {
        const value = vehicle[field.name as keyof VehicleRow];
        return [field.name, value != null ? String(value) : ""];
      })
    )
  );

  const handleFieldChange = useCallback((name: string, value: string) => {
    setChangedFields((prev) => {
      const next = new Set(prev);
      if (value !== initialValues.current[name]) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }, []);

  const handleSubmit = (formData: FormData) => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateVehicle(vehicle.id, formData);

      if (result.success) {
        toast.success("車両データを更新しました");
        router.push(`/vehicles/${vehicle.id}`);
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
    <div className="space-y-6">
      <RecordBreadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "車両一覧", href: "/vehicles" },
          { label: vehicle.vehicleCode, href: `/vehicles/${vehicle.id}` },
          { label: "編集" },
        ]}
      />

      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/vehicles/${vehicle.id}`)}
          className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          詳細に戻る
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{vehicle.vehicleCode}</h1>
            <p className="text-muted-foreground">編集中</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/vehicles/${vehicle.id}`)}
            >
              <X className="mr-1.5 h-4 w-4" />
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={() => formRef.current?.requestSubmit()}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      </div>

      {changedFields.size > 0 && (
        <div className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
          変更されたフィールド: {changedFields.size}件
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      )}

      <form ref={formRef} action={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="vehicleCode">車両コード</Label>
                <Input
                  id="vehicleCode"
                  value={vehicle.vehicleCode}
                  disabled
                  className="bg-muted"
                />
              </div>
              {vehicleFormFields.map((field) => (
                <FormField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  type={field.type as "text" | "number" | "select"}
                  required={field.required}
                  defaultValue={getFieldValue(vehicle, field.name)}
                  options={field.type === "select" && "options" in field ? [...field.options] : undefined}
                  fieldErrors={fieldErrors[field.name]}
                  disabled={isPending}
                  highlighted={changedFields.has(field.name)}
                  onValueChange={handleFieldChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function getFieldValue(vehicle: VehicleRow, fieldName: string): string | number {
  const value = vehicle[fieldName as keyof VehicleRow];
  if (value === null || value === undefined) return "";
  return value;
}
