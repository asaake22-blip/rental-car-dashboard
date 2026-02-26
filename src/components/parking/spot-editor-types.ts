/** 駐車場マップエディタの共有型定義 */

/** エディタモード（タブ切り替え） */
export type EditorMode = "spots" | "annotations";

/** 編集可能なスポットデータ */
export interface EditableSpot {
  id: string;
  spotNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** アノテーション種別 */
export type AnnotationType = "boundary" | "road" | "building" | "entrance" | "exit" | "label" | "line";

/** 線種 */
export type StrokeDash = "solid" | "dashed" | "dotted";

/** 方向（入口/出口用） */
export type Direction = "north" | "south" | "east" | "west";

/** アノテーションデータ */
export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeDash: StrokeDash;
  fontSize?: number;
  direction?: Direction;
  zIndex: number;
}

/** リサイズ方向 */
export type ResizeDirection = "nw" | "ne" | "sw" | "se";

/** ドラッグ操作モード */
export type DragMode = "move" | "resize" | "rotate";

/** ドラッグ対象の種別 */
export type DragTargetType = "spot" | "annotation";

/** ドラッグ中の一時状態（useRef で保持） */
export interface DragState {
  mode: DragMode;
  targetId: string;
  targetType: DragTargetType;
  startMouse: { x: number; y: number };
  startSpot: EditableSpot;
  resizeDir?: ResizeDirection;
}

/** エディタの状態 */
export interface SpotEditorState {
  spots: EditableSpot[];
  selectedSpotId: string | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  snapToGrid: boolean;
  editorMode: EditorMode;
}

/** エディタのアクション */
export type SpotEditorAction =
  | { type: "SET_SPOTS"; spots: EditableSpot[] }
  | { type: "ADD_SPOT"; spot: EditableSpot }
  | { type: "UPDATE_SPOT"; id: string; changes: Partial<EditableSpot> }
  | { type: "DELETE_SPOT"; id: string }
  | { type: "SELECT_SPOT"; id: string | null }
  | { type: "TOGGLE_SNAP" }
  | { type: "ADD_ANNOTATION"; annotation: Annotation }
  | { type: "UPDATE_ANNOTATION"; id: string; changes: Partial<Annotation> }
  | { type: "DELETE_ANNOTATION"; id: string }
  | { type: "SELECT_ANNOTATION"; id: string | null }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode };

/** 保存用ペイロード（spotsJsonImportSchema と互換） */
export interface SaveSpotPayload {
  spots: Array<{
    number: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>;
}

/** 保存用ペイロード（スポット + アノテーション） */
export interface SavePayload {
  spots: Array<{
    number: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>;
  annotations: Annotation[];
}
