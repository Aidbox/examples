import { highlightCode, tagHighlighter, tags } from "@lezer/highlight";
import { parser } from "lezer-fhirpath";

function highlightFhirPath(code: string) {
  let result = document.createElement("pre");
  let style = document.createElement("style");

  style.innerHTML = `
    .tok-string { color: #a11; }
    .tok-number { color: #192b8c; }
    .tok-operator, .tok-keyword { color: #4c0793; } /* Keywords like 'is', 'as', 'and' */
    .tok-variableName { color: #675900; } /* Variables like %patient */
    .tok-literal { color: #fa1c9c; } /* Date/Time/Quantity literals */
    .tok-functionName { color: green; } /* Function names like exists() */
    .tok-propertyName { color: #192b8c; font-style: italic; } /* Field access like .name */
    .tok-constantName, .tok-bool { color: #975305; } /* Booleans true/false */
    .tok-punctuation { color: #555; } /* Brackets, parens, commas */
    .tok-typeName { color: #192b8c; } /* Type specifiers like Patient */
    .tok-invalid { color: red; text-decoration: underline; } /* For errors */
  `;

  result.appendChild(style);

  function emit(text: string, classes: string) {
    let node: Node = document.createTextNode(text);
    if (classes) {
      let span = document.createElement("span");
      span.appendChild(node);
      span.className = classes;
      node = span;
    }
    result.appendChild(node);
  }

  function emitBreak() {
    result.appendChild(document.createTextNode("\n"));
  }

  highlightCode(
    code,
    parser.parse(code),
    tagHighlighter([
      { tag: tags.string, class: "tok-string" },
      { tag: tags.number, class: "tok-number" },
      { tag: tags.operator, class: "tok-operator" },
      { tag: tags.typeName, class: "tok-typeName" },
      { tag: tags.special(tags.variableName), class: "tok-variableName" },
      { tag: tags.special(tags.literal), class: "tok-literal" },
      { tag: tags.function(tags.variableName), class: "tok-functionName" },
      { tag: tags.function(tags.attributeName), class: "tok-propertyName" },
      { tag: tags.constant(tags.variableName), class: "tok-constantName" },
    ]),
    emit,
    emitBreak,
  );
  return result.outerHTML;
}

const Code = ({ value, className }: { value: string; className: string }) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: highlightFhirPath(value),
      }}
    />
  );
};

export default Code;
