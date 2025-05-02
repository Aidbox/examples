import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

export function JsonEditor({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const editorRef = useRef(null);
  const viewRef = useRef<EditorView | null>(null);
  const userEditRef = useRef(false);
  const valueRef = useRef(JSON.stringify(value, null, 2));
  const onChangeRef = useRef<((value: any) => void) | null>(null);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: valueRef.current,
      extensions: [
        basicSetup,
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            userEditRef.current = true;
            try {
              const jsonValue = JSON.parse(update.state.doc.toString());
              onChangeRef.current?.(jsonValue);
            } catch {
              // Handle JSON parse error if needed
            }
          }
        }),
        keymap.of([indentWithTab]),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-gutters": { display: "none" },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;

    // Skip update if change was initiated by user
    if (userEditRef.current) {
      userEditRef.current = false;
      return;
    }

    const currentDoc = viewRef.current.state.doc.toString();
    const newDoc = JSON.stringify(value, null, 2);

    if (currentDoc !== newDoc) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: newDoc,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="w-full text-sm flex-1 overflow-auto h-full"
    />
  );
}
