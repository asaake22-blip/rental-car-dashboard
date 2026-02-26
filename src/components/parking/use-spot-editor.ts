"use client";

import { useReducer, useCallback, useRef } from "react";
import type {
  EditableSpot,
  Annotation,
  AnnotationType,
  EditorMode,
  SpotEditorState,
  SpotEditorAction,
  SaveSpotPayload,
  SavePayload,
} from "./spot-editor-types";

/** デフォルトのスポットサイズ */
const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 120;

function spotEditorReducer(
  state: SpotEditorState,
  action: SpotEditorAction,
): SpotEditorState {
  switch (action.type) {
    case "SET_SPOTS":
      return { ...state, spots: action.spots, selectedSpotId: null };

    case "ADD_SPOT":
      return {
        ...state,
        spots: [...state.spots, action.spot],
        selectedSpotId: action.spot.id,
        selectedAnnotationId: null,
        editorMode: "spots",
      };

    case "UPDATE_SPOT":
      return {
        ...state,
        spots: state.spots.map((s) =>
          s.id === action.id ? { ...s, ...action.changes } : s,
        ),
      };

    case "DELETE_SPOT":
      return {
        ...state,
        spots: state.spots.filter((s) => s.id !== action.id),
        selectedSpotId:
          state.selectedSpotId === action.id ? null : state.selectedSpotId,
      };

    case "SELECT_SPOT":
      return {
        ...state,
        selectedSpotId: action.id,
        selectedAnnotationId: null,
      };

    case "TOGGLE_SNAP":
      return { ...state, snapToGrid: !state.snapToGrid };

    case "ADD_ANNOTATION":
      return {
        ...state,
        annotations: [...state.annotations, action.annotation],
        selectedAnnotationId: action.annotation.id,
        selectedSpotId: null,
        editorMode: "annotations",
      };

    case "UPDATE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.id ? { ...a, ...action.changes } : a,
        ),
      };

    case "DELETE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.id),
        selectedAnnotationId:
          state.selectedAnnotationId === action.id
            ? null
            : state.selectedAnnotationId,
      };

    case "SELECT_ANNOTATION":
      return {
        ...state,
        selectedAnnotationId: action.id,
        selectedSpotId: null,
      };

    case "SET_EDITOR_MODE":
      return {
        ...state,
        editorMode: action.mode,
        selectedSpotId: null,
        selectedAnnotationId: null,
      };

    default:
      return state;
  }
}

/** 次のスポット番号を生成（例: "1", "2", ...） */
function nextSpotNumber(spots: EditableSpot[]): string {
  let max = 0;
  for (const s of spots) {
    const num = parseInt(s.spotNumber, 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return String(max + 1);
}

/** アノテーション種別ごとのデフォルト値を生成 */
function createDefaultAnnotation(
  type: AnnotationType,
  canvasWidth: number,
  canvasHeight: number,
): Omit<Annotation, "id"> {
  const base = {
    type,
    rotation: 0,
    strokeDash: "solid" as const,
  };

  switch (type) {
    case "boundary":
      return {
        ...base,
        x: canvasWidth * 0.1,
        y: canvasHeight * 0.1,
        width: canvasWidth * 0.8,
        height: canvasHeight * 0.8,
        strokeColor: "#374151",
        fillColor: "rgba(0,0,0,0.03)",
        strokeWidth: 3,
        zIndex: 0,
      };
    case "road":
      return {
        ...base,
        x: 0,
        y: canvasHeight - 60,
        width: canvasWidth,
        height: 60,
        strokeColor: "#9ca3af",
        fillColor: "#e5e7eb",
        strokeWidth: 1,
        label: "道路",
        zIndex: 0,
      };
    case "building":
      return {
        ...base,
        x: canvasWidth - 140,
        y: 20,
        width: 120,
        height: 80,
        strokeColor: "#ea580c",
        fillColor: "#fff7ed",
        strokeWidth: 2,
        label: "営業所",
        zIndex: 1,
      };
    case "entrance":
      return {
        ...base,
        x: canvasWidth / 2 - 20,
        y: canvasHeight - 40,
        width: 40,
        height: 40,
        strokeColor: "#16a34a",
        fillColor: "transparent",
        strokeWidth: 2,
        label: "入口",
        direction: "north",
        zIndex: 2,
      };
    case "exit":
      return {
        ...base,
        x: canvasWidth / 2 + 30,
        y: canvasHeight - 40,
        width: 40,
        height: 40,
        strokeColor: "#dc2626",
        fillColor: "transparent",
        strokeWidth: 2,
        label: "出口",
        direction: "south",
        zIndex: 2,
      };
    case "label":
      return {
        ...base,
        x: canvasWidth / 2,
        y: 20,
        width: 0,
        height: 0,
        strokeColor: "transparent",
        fillColor: "transparent",
        strokeWidth: 0,
        label: "ラベル",
        fontSize: 14,
        zIndex: 3,
      };
    case "line":
      return {
        ...base,
        x: 50,
        y: canvasHeight / 2,
        width: canvasWidth - 100,
        height: 2,
        strokeColor: "#6b7280",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeDash: "dashed",
        zIndex: 1,
      };
  }
}

export function useSpotEditor(
  initialSpots: EditableSpot[],
  canvasWidth: number,
  canvasHeight: number,
  initialAnnotations: Annotation[] = [],
) {
  const [state, dispatch] = useReducer(spotEditorReducer, {
    spots: initialSpots,
    selectedSpotId: null,
    annotations: initialAnnotations,
    selectedAnnotationId: null,
    snapToGrid: true,
    editorMode: "spots",
  });

  // 初期値を保持（isDirty 判定用）
  const initialRef = useRef(JSON.stringify(initialSpots));
  const initialAnnotationsRef = useRef(JSON.stringify(initialAnnotations));

  const addSpot = useCallback(() => {
    const spot: EditableSpot = {
      id: crypto.randomUUID(),
      spotNumber: nextSpotNumber(state.spots),
      x: Math.round(canvasWidth / 2 - DEFAULT_WIDTH / 2),
      y: Math.round(canvasHeight / 2 - DEFAULT_HEIGHT / 2),
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      rotation: 0,
    };
    dispatch({ type: "ADD_SPOT", spot });
  }, [state.spots, canvasWidth, canvasHeight]);

  const updateSpot = useCallback(
    (id: string, changes: Partial<EditableSpot>) => {
      dispatch({ type: "UPDATE_SPOT", id, changes });
    },
    [],
  );

  const deleteSpot = useCallback((id: string) => {
    dispatch({ type: "DELETE_SPOT", id });
  }, []);

  const selectSpot = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_SPOT", id });
  }, []);

  const toggleSnap = useCallback(() => {
    dispatch({ type: "TOGGLE_SNAP" });
  }, []);

  const addAnnotation = useCallback(
    (type: AnnotationType) => {
      const defaults = createDefaultAnnotation(type, canvasWidth, canvasHeight);
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        ...defaults,
      };
      dispatch({ type: "ADD_ANNOTATION", annotation });
    },
    [canvasWidth, canvasHeight],
  );

  const updateAnnotation = useCallback(
    (id: string, changes: Partial<Annotation>) => {
      dispatch({ type: "UPDATE_ANNOTATION", id, changes });
    },
    [],
  );

  const deleteAnnotation = useCallback((id: string) => {
    dispatch({ type: "DELETE_ANNOTATION", id });
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ANNOTATION", id });
  }, []);

  const setEditorMode = useCallback((mode: EditorMode) => {
    dispatch({ type: "SET_EDITOR_MODE", mode });
  }, []);

  const selectedSpot =
    state.spots.find((s) => s.id === state.selectedSpotId) ?? null;

  const selectedAnnotation =
    state.annotations.find((a) => a.id === state.selectedAnnotationId) ?? null;

  // スポットまたはアノテーションに変更があるかを判定
  const spotsDirty =
    JSON.stringify(
      state.spots.map(({ id: _id, ...rest }) => rest),
    ) !==
    JSON.stringify(
      initialSpots.map(({ id: _id, ...rest }) => rest),
    );

  const annotationsDirty =
    JSON.stringify(
      state.annotations.map(({ id: _id, ...rest }) => rest),
    ) !==
    JSON.stringify(
      initialAnnotations.map(({ id: _id, ...rest }) => rest),
    );

  const isDirty = spotsDirty || annotationsDirty;

  /** 保存用ペイロード生成（スポット + アノテーション） */
  const toSavePayload = useCallback((): SavePayload => {
    return {
      spots: state.spots.map((s) => ({
        number: s.spotNumber,
        x: Math.round(s.x * 10) / 10,
        y: Math.round(s.y * 10) / 10,
        width: Math.round(s.width * 10) / 10,
        height: Math.round(s.height * 10) / 10,
        rotation: Math.round(s.rotation * 10) / 10,
      })),
      annotations: state.annotations,
    };
  }, [state.spots, state.annotations]);

  return {
    state,
    addSpot,
    updateSpot,
    deleteSpot,
    selectSpot,
    toggleSnap,
    selectedSpot,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    selectedAnnotation,
    setEditorMode,
    isDirty,
    toSavePayload,
  };
}
