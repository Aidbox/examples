import React, { Fragment } from "react";
import { getFields } from "@utils/fhir";
import { useProgramContext } from "@utils/store.js";
import { mergeRefs, useDebug } from "@utils/react.js";
import { Shapes } from "@phosphor-icons/react";

import { stringifyType } from "@utils/stringify.js";
import Dropdown from "@components/Dropdown.jsx";

const FieldToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, getFhirSchema } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        getFhirSchema: state.getFhirSchema,
      }),
    );

    const precedingExpressionType = useProgramContext((state) =>
      state.getBindingExpressionType(bindingId, tokenIndex),
    );

    const fields = getFields(precedingExpressionType, getFhirSchema());
    const debug = useDebug();

    return (
      <Dropdown
        items={Object.keys(fields)}
        searchFn={(name, term) =>
          name.toLowerCase().includes(term.toLowerCase())
        }
        keyFn={(name) => name}
        onClick={(name) => {
          updateToken(bindingId, tokenIndex, { value: name });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600`,
            })}
          >
            {tokenIndex > 0 ? "." : ""}
            {token.value}
          </button>
        )}
        renderItem={(name) => (
          <>
            <Shapes size={16} className="text-gray-500 flex-shrink-0" />
            <span className="truncate">{name}</span>
            {debug && (
              <span className="text-sm text-gray-500 truncate flex-1 text-right">
                {stringifyType(fields[name])}
              </span>
            )}
          </>
        )}
      />
    );
  },
);

export default FieldToken;
