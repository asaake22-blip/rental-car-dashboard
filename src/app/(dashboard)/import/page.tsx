"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ImportResult } from "@/lib/import/types";

type PreviewData = {
  fileName: string;
  sheets: string[];
  currentSheet: string;
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
};

type ImportHistory = {
  id: string;
  fileName: string;
  sheetName: string | null;
  recordCount: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  errorLog: string | null;
  importedAt: string;
};

const TARGET_OPTIONS = [
  { value: "company", label: "会社マスタ" },
  { value: "customer", label: "顧客マスタ" },
  { value: "dailyReportDealer", label: "日報ディーラー" },
  { value: "reservation", label: "予約データ" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await fetch("/api/import/preview", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());

      const data: PreviewData = await res.json();
      setPreview(data);
      setSelectedSheet(data.currentSheet);
    } catch (err) {
      setError(`プレビュー取得に失敗しました: ${String(err)}`);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSheetChange = useCallback(async (sheet: string) => {
    if (!file) return;
    setSelectedSheet(sheet);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetName", sheet);

      const res = await fetch("/api/import/preview", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());

      const data: PreviewData = await res.json();
      setPreview(data);
    } catch (err) {
      setError(`シートの読み込みに失敗しました: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleImport = useCallback(async () => {
    if (!file || !target) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);
      if (selectedSheet) formData.append("sheetName", selectedSheet);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "インポートに失敗しました");
      }

      const data: ImportResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [file, target, selectedSheet]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/import?action=history");
      const data = await res.json();
      setHistory(data);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">データインポート</h2>

      {/* ファイル選択 + 設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            ファイルアップロード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="file">ファイル選択（.xlsx / .xls / .csv）</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </div>

            {preview && preview.sheets.length > 1 && (
              <div className="space-y-2">
                <Label>シート選択</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {preview.sheets.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>インポート先テーブル</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {preview && (
            <p className="text-sm text-muted-foreground">
              <FileSpreadsheet className="inline size-4 mr-1" />
              {preview.fileName} — {preview.totalRows.toLocaleString()}行 / {preview.headers.length}列
            </p>
          )}

          <Button onClick={handleImport} disabled={!file || !target || loading}>
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
            インポート実行
          </Button>
        </CardContent>
      </Card>

      {/* エラー */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="size-5 mt-0.5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* インポート結果 */}
      {result && (
        <Card className={result.errors.length === 0 ? "border-green-500" : "border-yellow-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-500" />
              インポート結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-4">
              <div>
                <span className="text-sm text-muted-foreground">全行数</span>
                <p className="text-lg font-semibold">{result.totalRows.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">取り込み成功</span>
                <p className="text-lg font-semibold text-green-600">{result.importedRows.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">スキップ</span>
                <p className="text-lg font-semibold text-yellow-600">{result.skippedRows.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">エラー</span>
                <p className="text-lg font-semibold text-red-600">{result.errors.length}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto text-sm">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-destructive">
                    行 {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* プレビュー */}
      {preview && preview.previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>プレビュー（先頭10行）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.headers.map((h) => (
                        <TableCell key={h} className="whitespace-nowrap max-w-[200px] truncate">
                          {row[h]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* インポート履歴 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>インポート履歴</CardTitle>
          <Button variant="outline" size="sm" onClick={loadHistory}>
            履歴を読み込み
          </Button>
        </CardHeader>
        {history.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ファイル名</TableHead>
                  <TableHead>シート</TableHead>
                  <TableHead>件数</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.fileName}</TableCell>
                    <TableCell>{h.sheetName || "—"}</TableCell>
                    <TableCell>{h.recordCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.status === "SUCCESS" ? "default" :
                          h.status === "PARTIAL" ? "secondary" : "destructive"
                        }
                      >
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(h.importedAt).toLocaleString("ja-JP")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
