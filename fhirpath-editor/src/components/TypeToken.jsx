import React, { Fragment } from "react";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  StringType,
  TimeType,
} from "@utils/type";
import { FhirType, primitiveTypeMap } from "@utils/fhir";
import { useProgramContext } from "@utils/store.js";
import { stringifyTypeToken } from "@utils/stringify.js";
import { distinct } from "../utils/misc";
import { Tag } from "@phosphor-icons/react";
import Dropdown from "@components/Dropdown.jsx";
import { mergeRefs } from "@utils/react.js";

const TypeToken = React.forwardRef(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, getFhirSchema } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex),
        updateToken: state.updateToken,
        getFhirSchema: state.getFhirSchema,
      }),
    );

    const typesGroups = {
      "Literal Types": [
        IntegerType,
        DecimalType,
        StringType,
        BooleanType,
        DateType,
        DateTimeType,
        TimeType,
      ],
      "FHIR Primitive Types": [...Object.values(primitiveTypeMap)],
      "FHIR Complex Types": distinct(
        Object.values(getFhirSchema())
          .filter(
            (schema) =>
              schema.kind === "complex-type" &&
              schema.derivation !== "constraint",
          )
          .map((schema) => schema.id),
      )
        .sort()
        .map((id) => FhirType([id])),
      "FHIR Resource Types": distinct(
        Object.values(getFhirSchema())
          .filter(
            (schema) =>
              schema.kind === "resource" && schema.derivation !== "constraint",
          )
          .map((schema) => schema.id),
      )
        .sort()
        .map((id) => FhirType([id])),
    };

    return (
      <Dropdown
        items={Object.entries(typesGroups).flatMap(([, values]) => values)}
        searchFn={(type, term) =>
          JSON.stringify(type).toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(type) =>
          Object.keys(typesGroups).find((group) => {
            return typesGroups[group].includes(type);
          })
        }
        onClick={(type) => {
          updateToken(bindingId, tokenIndex, { value: type });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef, ref)}
            {...mergeProps({
              className: `cursor-pointer focus:outline-none px-1 py-0.5 rounded bg-slate-50 border border-slate-300 text-slate-600`,
            })}
          >
            {stringifyTypeToken(token)}
          </button>
        )}
        renderItem={(type) => (
          <>
            <Tag size={16} className="text-gray-500 shrink-0" />
            <span className="truncate">
              {stringifyTypeToken({ type: "type", value: type })}
            </span>
          </>
        )}
      />
    );
  },
);

export default TypeToken;
