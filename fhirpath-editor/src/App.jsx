import React from "react";
import Editor from "./components/Editor";
import { sampleBindings, sampleExpression } from "./utils/expression";

export function App() {
  const [app, setApp] = React.useState({
    bindings: sampleBindings,
    expression: sampleExpression,
  });

  return <Editor value={app} setValue={setApp} />;
}
