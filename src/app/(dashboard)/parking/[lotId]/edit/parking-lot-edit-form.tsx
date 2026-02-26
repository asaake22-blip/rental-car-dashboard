"use client";

import { useTransition, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, X, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/crud/form-field";
import { parkingLotFormFields } from "@/lib/validations/parking";
import { updateParkingLot, saveParkingSpotLayout, saveParkingAnnotations } from "@/app/actions/parking";
import { getOfficeListForSelect } from "@/app/actions/office";
import { toast } from "sonner";

import { useSpotEditor } from "@/components/parking/use-spot-editor";
import { SpotEditorCanvas } from "@/components/parking/spot-editor-canvas";
import { SpotPropertyPanel } from "@/components/parking/spot-property-panel";
import { SpotEditorToolbar } from "@/components/parking/spot-editor-toolbar";
import { AnnotationPropertyPanel } from "@/components/parking/annotation-property-panel";
import type { EditableSpot, Annotation } from "@/components/parking/spot-editor-types";

interface ParkingLotEditFormProps {
  lot: {
    id: string;
    name: string;
    officeId: string;
    canvasWidth: number;
    canvasHeight: number;
    officeName: string;
  };
  spots: EditableSpot[];
  annotations?: Annotation[];
}

export function ParkingLotEditForm({ lot, spots: initialSpots, annotations: initialAnnotations = [] }: ParkingLotEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offices, setOffices] = useState<Array<{ id: string; officeName: string }>>([]);
  const [canvasWidth, setCanvasWidth] = useState(lot.canvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(lot.canvasHeight);
  const formRef = useRef<HTMLFormElement>(null);

  // スポットエディタ（キャンバスサイズは state から参照）
  const editor = useSpotEditor(initialSpots, canvasWidth, canvasHeight, initialAnnotations);

  useEffect(() => {
    getOfficeListForSelect().then((list) => {
      setOffices(list as Array<{ id: string; officeName: string }>);
    });
  }, []);

  // キーボードショートカット（Delete/Backspace で削除）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        if (editor.selectedSpot) {
          e.preventDefault();
          editor.deleteSpot(editor.selectedSpot.id);
        } else if (editor.selectedAnnotation) {
          e.preventDefault();
          editor.deleteAnnotation(editor.selectedAnnotation.id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor.selectedSpot, editor.deleteSpot, editor.selectedAnnotation, editor.deleteAnnotation]);

  // 未保存変更の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editor.isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor.isDirty]);

  const officeOptions = offices.map((o) => ({ value: o.id, label: o.officeName }));

  // キャンバスサイズ変更をリアルタイム同期
  const handleFieldChange = useCallback((name: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 100) return;
    if (name === "canvasWidth") setCanvasWidth(num);
    if (name === "canvasHeight") setCanvasHeight(num);
  }, []);

  const handleSave = useCallback(() => {
    setFieldErrors({});
    setErrorMessage(null);

    startTransition(async () => {
      // 1. メタデータ更新
      const formData = new FormData(formRef.current!);
      const metaResult = await updateParkingLot(lot.id, formData);

      if (!metaResult.success) {
        if (metaResult.fieldErrors) setFieldErrors(metaResult.fieldErrors);
        if (metaResult.error) {
          setErrorMessage(metaResult.error);
          toast.error(metaResult.error);
        }
        return;
      }

      // 2. スポットレイアウト保存（変更がある場合のみ）
      if (editor.isDirty) {
        const payload = editor.toSavePayload();
        const spotsResult = await saveParkingSpotLayout(lot.id, { spots: payload.spots });

        if (!spotsResult.success) {
          if (spotsResult.error) {
            setErrorMessage(spotsResult.error);
            toast.error(spotsResult.error);
          }
          return;
        }

        // 3. アノテーション保存
        const annotationsResult = await saveParkingAnnotations(lot.id, {
          annotations: payload.annotations as unknown as Array<Record<string, unknown>>,
        });

        if (!annotationsResult.success) {
          if (annotationsResult.error) {
            setErrorMessage(annotationsResult.error);
            toast.error(annotationsResult.error);
          }
          return;
        }
      }

      toast.success("駐車場を更新しました");
      router.push(`/parking/${lot.id}`);
    });
  }, [lot.id, editor, router, startTransition]);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/parking/${lot.id}`)}
        className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        マップに戻る
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lot.name}</h1>
          <p className="text-muted-foreground">{lot.officeName} — 編集中</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/parking/${lot.id}`)}
          >
            <X className="mr-1.5 h-4 w-4" />
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage}
        </div>
      )}

      {/* 駐車場メタデータ */}
      <form ref={formRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">駐車場設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {parkingLotFormFields.map((field) => {
                if (field.name === "officeId") {
                  return (
                    <FormField
                      key={field.name}
                      name={field.name}
                      label="営業所"
                      type="select"
                      required={field.required}
                      defaultValue={lot.officeId}
                      options={officeOptions}
                      fieldErrors={fieldErrors[field.name]}
                      disabled={isPending}
                    />
                  );
                }
                return (
                  <FormField
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    type={field.type as "text" | "number"}
                    required={field.required}
                    defaultValue={getLotFieldValue(lot, field.name)}
                    fieldErrors={fieldErrors[field.name]}
                    disabled={isPending}
                    onValueChange={
                      field.name === "canvasWidth" || field.name === "canvasHeight"
                        ? handleFieldChange
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* スポットエディタ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">駐車枠レイアウト</CardTitle>
        </CardHeader>
        <CardContent>
          <SpotEditorToolbar
            spotCount={editor.state.spots.length}
            hasSelection={editor.selectedSpot !== null || editor.selectedAnnotation !== null}
            snapToGrid={editor.state.snapToGrid}
            onAddSpot={editor.addSpot}
            onDeleteSelected={() => {
              if (editor.selectedSpot) editor.deleteSpot(editor.selectedSpot.id);
              else if (editor.selectedAnnotation) editor.deleteAnnotation(editor.selectedAnnotation.id);
            }}
            onToggleSnap={editor.toggleSnap}
            onAddAnnotation={editor.addAnnotation}
            editorMode={editor.state.editorMode}
            onSetEditorMode={editor.setEditorMode}
          />
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <SpotEditorCanvas
                spots={editor.state.spots}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                selectedSpotId={editor.state.selectedSpotId}
                snapToGrid={editor.state.snapToGrid}
                onSelectSpot={editor.selectSpot}
                onUpdateSpot={editor.updateSpot}
                onAddSpot={editor.addSpot}
                annotations={editor.state.annotations}
                selectedAnnotationId={editor.state.selectedAnnotationId}
                onSelectAnnotation={editor.selectAnnotation}
                onUpdateAnnotation={editor.updateAnnotation}
                editorMode={editor.state.editorMode}
              />
            </div>
            <div className="w-64 shrink-0 border rounded-lg bg-muted/30">
              {editor.selectedAnnotation ? (
                <AnnotationPropertyPanel
                  annotation={editor.selectedAnnotation}
                  onUpdate={editor.updateAnnotation}
                  onDelete={editor.deleteAnnotation}
                />
              ) : (
                <SpotPropertyPanel
                  spot={editor.selectedSpot}
                  allSpots={editor.state.spots}
                  onUpdate={editor.updateSpot}
                  onDelete={editor.deleteSpot}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getLotFieldValue(
  lot: { name: string; officeId: string; canvasWidth: number; canvasHeight: number },
  fieldName: string,
): string | number {
  const map: Record<string, string | number> = {
    officeId: lot.officeId,
    name: lot.name,
    canvasWidth: lot.canvasWidth,
    canvasHeight: lot.canvasHeight,
  };
  return map[fieldName] ?? "";
}
