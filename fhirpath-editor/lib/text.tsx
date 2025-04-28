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
      asNamedExpression: "As named expression",
    },
  },
  dropdown: {
    search: {
      placeholder: "Search...",
    },
    empty: {
      nothingFound: "Nothing found",
    },
  },
  program: {
    title: {
      namedExpressions: "Named Expressions",
      mainExpression: "Main Expression",
      argumentExpression: "Argument expression",
    },
  },
  token: {
    answer: {
      newExpression: "New named expression",
    },
    function: {
      search: {
        placeholder: "Search...",
      },
      label: {
        arguments: "arguments",
      },
    },
    type: {
      groups: {
        literalTypes: "Literal Types",
        fhirPrimitiveTypes: "FHIR Primitive Types",
        fhirComplexTypes: "FHIR Complex Types",
        fhirResourceTypes: "FHIR Resource Types",
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
