import { createContext, ReactNode, useContext, useMemo } from "react";
import { deepMerge } from "./utils/misc";
import { DeepPartial } from "./types/internal.ts";

export const text = {
  binding: {
    name: {
      placeholder: "Name",
    },
    menu: {
      delete: "Delete",
      duplicate: "Duplicate",
      asVariable: "As variable",
    },
  },
  dropdown: {
    group: {
      showMore: "Show more",
      showLess: "Show less",
    },
    search: {
      placeholder: "Search...",
    },
    empty: {
      nothingFound: "Nothing found",
    },
  },
  program: {
    define: "Add expression",
    placeholder: {
      mainExpression: "Add your formula here...",
      argumentExpression: "Add your argument here...",
    },
    title: {
      variables: "Variables",
      mainExpression: "Final expression",
    },
  },
  cursor: {
    groups: {
      variable: "Variables",
      operator: "Operators",
      function: "Functions",
      field: "Fields",
      index: "Indexes",
      answer: "Questionnaire",
      literal: "Literals",
    },
  },
  token: {
    answer: {
      newExpression: "New variable",
    },
    function: {
      search: {
        placeholder: "Search...",
      },
      label: {
        arguments: "Arguments",
      },
    },
    type: {
      groups: {
        literalTypes: "Literal types",
        fhirPrimitiveTypes: "FHIR primitive types",
        fhirComplexTypes: "FHIR complex types",
        fhirResourceTypes: "FHIR resource types",
      },
    },
    labels: {
      number: "Number",
      string: "String",
      boolean: "Boolean",
      date: "Date",
      datetime: "Date and time",
      time: "Time",
      quantity: "Quantity",
      type: "Type",
      index: "Index",
      null: "Empty",
    },
  },
  value: {
    error: {
      message: "error",
      empty: "empty",
      bindingError: "One of the bindings ({origin}) has an error",
    },
  },
};

export type Text = typeof text;

const textContext = createContext(text);

export const useText = (): Text => {
  return useContext(textContext);
};

export const TextProvider = ({
  text: customText,
  children,
}: {
  text?: DeepPartial<Text>;
  children: ReactNode;
}) => {
  const mergedText = useMemo(
    () => (customText ? deepMerge(text, customText) : text),
    [customText],
  );

  return (
    <textContext.Provider value={mergedText}>{children}</textContext.Provider>
  );
};
