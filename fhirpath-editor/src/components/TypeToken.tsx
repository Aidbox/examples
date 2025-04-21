import React, { useMemo } from "react";
import {
  BooleanType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  StringType,
  TimeType,
} from "@/utils/type";
import { FhirType, primitiveTypeMap } from "@/utils/fhir";
import { useProgramContext } from "@/utils/store";
import { stringifyTypeToken } from "@/utils/stringify";
import { distinct } from "@/utils/misc";
import { Tag } from "@phosphor-icons/react";
import Dropdown from "@/components/Dropdown";
import { mergeRefs } from "@/utils/react";
import {
  ITokenComponentProps,
  IType,
  ITypeToken,
  TokenType,
} from "@/types/internal";

const TypeToken = React.forwardRef<HTMLElement, ITokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const { token, updateToken, getFhirSchema } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex) as ITypeToken,
        updateToken: state.updateToken,
        getFhirSchema: state.getFhirSchema,
      }),
    );

    const fhirSchema = getFhirSchema();
    const typesGroups: Record<string, IType[]> = useMemo(
      () => ({
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
          Object.values(fhirSchema)
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
          Object.values(fhirSchema)
            .filter(
              (schema) =>
                schema.kind === "resource" &&
                schema.derivation !== "constraint",
            )
            .map((schema) => schema.id),
        )
          .sort()
          .map((id) => FhirType([id])),
      }),
      [fhirSchema],
    );

    const items = Object.entries(typesGroups).flatMap(([, values]) => values);

    return (
      <Dropdown
        items={items}
        searchFn={(type, term) =>
          JSON.stringify(type).toLowerCase().includes(term.toLowerCase())
        }
        groupFn={(type) =>
          Object.keys(typesGroups).find((group) => {
            return typesGroups[group]?.includes(type);
          }) || ""
        }
        onClick={(type) => {
          updateToken(bindingId, tokenIndex, { value: type });
        }}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as React.Ref<HTMLButtonElement>, ref)}
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
              {stringifyTypeToken({ type: TokenType.type, value: type })}
            </span>
          </>
        )}
      />
    );
  },
);

export default TypeToken;
