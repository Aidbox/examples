import React, { useEffect } from "react";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

export function JsonEditor({ value, onChange }) {
  const editorRef = React.useRef(null);
  const viewRef = React.useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: JSON.stringify(value, null, 2),
      extensions: [
        basicSetup,
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            try {
              const jsonValue = JSON.parse(update.state.doc.toString());
              onChange(jsonValue);
            } catch {}
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
      viewRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;

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
  }, [value, viewRef.current]);

  return (
    <div
      ref={editorRef}
      className="w-full text-xs flex-1 overflow-auto h-full"
    />
  );
}
