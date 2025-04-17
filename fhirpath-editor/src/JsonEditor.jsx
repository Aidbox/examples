import React, { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

export function JsonEditor({ value, onChange }) {
  const editorRef = React.useRef(null);
  const viewRef = React.useRef(null);
  const userEditRef = React.useRef(false);
  const initialValue = useRef(JSON.stringify(value, null, 2));

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: initialValue.current,
      extensions: [
        basicSetup,
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            userEditRef.current = true;
            try {
              const jsonValue = JSON.parse(update.state.doc.toString());
              onChange(jsonValue);
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
      viewRef.current.destroy();
    };
  }, [onChange]);

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
