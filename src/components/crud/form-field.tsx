"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "select";
  required?: boolean;
  defaultValue?: string | number;
  options?: ReadonlyArray<{ value: number | string; label: string }>;
  fieldErrors?: string[];
  disabled?: boolean;
  /** 変更されたフィールドをハイライト表示する */
  highlighted?: boolean;
  /** フィールド値変更時のコールバック */
  onValueChange?: (name: string, value: string) => void;
}

/**
 * 共通フォームフィールド
 *
 * Label（必須マーク付き） + Input/Select + エラー表示。
 * CRUD ダイアログ内で繰り返し使う入力フィールドを統一。
 */
export function FormField({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  options,
  fieldErrors,
  disabled = false,
  highlighted,
  onValueChange,
}: FormFieldProps) {
  const highlightClass = highlighted
    ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-700"
    : "";

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {highlighted && <span className="text-yellow-600 ml-1.5 text-xs">変更済み</span>}
      </Label>

      {type === "select" && options ? (
        <Select
          name={name}
          defaultValue={String(defaultValue ?? options[0]?.value ?? "")}
          onValueChange={(value) => onValueChange?.(name, value)}
        >
          <SelectTrigger id={name} disabled={disabled} className={highlightClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          disabled={disabled}
          className={highlightClass}
          aria-invalid={fieldErrors && fieldErrors.length > 0 ? true : undefined}
          onChange={(e) => onValueChange?.(name, e.target.value)}
        />
      )}

      {fieldErrors && fieldErrors.length > 0 && (
        <p className="text-destructive text-xs">{fieldErrors[0]}</p>
      )}
    </div>
  );
}
