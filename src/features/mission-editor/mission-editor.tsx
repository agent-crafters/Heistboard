"use client";

import ImageEditor, {
  type ImageEditorInstance,
  type ImageEditorOptions,
  type ImageEditorSaveResult,
} from "@unlayer/react-image-editor";

const MISSION_TOOL_OPTIONS: ImageEditorOptions = {
  theme: "dark",
  aiAssistantOpenState: "closed",
  features: {
    ai: false,
    imageEditor: {
      enabled: true,
      tools: {
        crop: false,
        resize: false,
        filter: false,
        draw: true,
        text: true,
        shapes: true,
        stickers: false,
        frame: false,
      },
    },
  },
};

interface MissionEditorProps {
  image: string;
  retryKey: number;
  onLoad: (editor: ImageEditorInstance) => void;
  onSave: (result: ImageEditorSaveResult) => void;
  onCancel: () => void;
  onImageError: () => void;
  onEditorError: (error: Error) => void;
}

export function MissionEditor({
  image,
  retryKey,
  onLoad,
  onSave,
  onCancel,
  onImageError,
  onEditorError,
}: MissionEditorProps) {
  return (
    <ImageEditor
      key={retryKey}
      editorId={`heistboard-mission-editor-${retryKey}`}
      image={image}
      minHeight="min(680px, 72vh)"
      options={MISSION_TOOL_OPTIONS}
      onLoad={onLoad}
      onSave={onSave}
      onCancel={onCancel}
      onLoadError={onImageError}
      onError={onEditorError}
      style={{ width: "100%", background: "#171b1c" }}
    />
  );
}
