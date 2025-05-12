import { createContext, ReactNode, useContext, useMemo } from "react";
import dropdown from "./components/Dropdown.module.css";
import token from "./components/Token.module.css";
import { deepMerge } from "./utils/misc.ts";
import { DeepPartial } from "./types/internal.ts";
import answerToken from "./components/AnswerToken.module.css";
import argument from "./components/Argument.module.css";
import binding from "./components/Binding.module.css";
import bindingMenu from "./components/BindingMenu.module.css";
import booleanToken from "./components/BooleanToken.module.css";
import cursor from "./components/Cursor.module.css";
import dateTimeToken from "./components/DateTimeToken.module.css";
import dateToken from "./components/DateToken.module.css";
import functionToken from "./components/FunctionToken.module.css";
import indexToken from "./components/IndexToken.module.css";
import jsonView from "./components/JsonView.module.css";
import nullToken from "./components/NullToken.module.css";
import numberToken from "./components/NumberToken.module.css";
import operatorIcon from "./components/OperatorIcon.module.css";
import operatorToken from "./components/OperatorToken.module.css";
import program from "./components/Program.module.css";
import quantityToken from "./components/QuantityToken.module.css";
import stringToken from "./components/StringToken.module.css";
import timeToken from "./components/TimeToken.module.css";
import valueViewer from "./components/ValueViewer.module.css";

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
    null: nullToken,
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
