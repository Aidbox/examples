import answerToken from "./components/AnswerToken.module.css";
import argument from "./components/Argument.module.css";
import binding from "./components/Binding.module.css";
import bindingMenu from "./components/BindingMenu.module.css";
import booleanToken from "./components/BooleanToken.module.css";
import cursor from "./components/Cursor.module.css";
import dateTimeToken from "./components/DateTimeToken.module.css";
import dateToken from "./components/DateToken.module.css";
import dropdown from "./components/Dropdown.module.css";
import functionToken from "./components/FunctionToken.module.css";
import indexToken from "./components/IndexToken.module.css";
import jsonView from "./components/JsonView.module.css";
import numberToken from "./components/NumberToken.module.css";
import operatorIcon from "./components/OperatorIcon.module.css";
import operatorToken from "./components/OperatorToken.module.css";
import program from "./components/Program.module.css";
import quantityToken from "./components/QuantityToken.module.css";
import stringToken from "./components/StringToken.module.css";
import timeToken from "./components/TimeToken.module.css";
import token from "./components/Token.module.css";
import valueViewer from "./components/ValueViewer.module.css";
import { createContext, ReactNode, useContext, useMemo } from "react";

// Recursive type for deeply partial objects
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = target[key as keyof typeof target];

      if (isObject(sourceValue)) {
        if (!(key in target)) {
          output[key as keyof T] = sourceValue as T[keyof T];
        } else if (isObject(targetValue)) {
          output[key as keyof T] = deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as DeepPartial<Record<string, unknown>>,
          ) as T[keyof T];
        } else {
          output[key as keyof T] = sourceValue as T[keyof T];
        }
      } else if (sourceValue !== undefined) {
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    });
  }

  return output;
}

export const style = {
  binding: {
    ...binding,
    menu: bindingMenu,
    cursor,
    value: {
      ...valueViewer,
      json: jsonView,
    },
  },
  dropdown,
  program,
  token: {
    ...token,
    answer: answerToken,
    boolean: booleanToken,
    dateTime: dateTimeToken,
    date: dateToken,
    function: {
      ...functionToken,
      argument,
    },
    index: indexToken,
    number: numberToken,
    operator: {
      ...operatorToken,
      icon: operatorIcon,
    },
    quantity: quantityToken,
    string: stringToken,
    time: timeToken,
  },
};

export type Style = typeof style;

const styleContext = createContext(style);

export const useStyle = (): Style => {
  return useContext(styleContext);
};

export const StyleProvider = ({
  style: customStyle,
  children,
}: {
  style?: DeepPartial<Style>;
  children: ReactNode;
}) => {
  const mergedStyle = useMemo(
    () => (customStyle ? deepMerge(style, customStyle) : style),
    [customStyle],
  );

  return (
    <styleContext.Provider value={mergedStyle}>
      {children}
    </styleContext.Provider>
  );
};
