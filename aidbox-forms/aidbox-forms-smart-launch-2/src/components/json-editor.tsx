"use client";

import Editor from "@monaco-editor/react";

interface JsonEditorProps {
  initialValue?: any;
  onSave?: (data: any) => void;
}

export function JsonEditor({ initialValue }: JsonEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      defaultValue={JSON.stringify(initialValue, null, 2)}
      options={{
        minimap: { enabled: false },
        formatOnPaste: true,
        formatOnType: true,
        automaticLayout: true,
        readOnly: true,
      }}
    />
  );
}
