import { forwardRef, Ref, useMemo } from "react";
import {
  BooleanType,
  ComplexType,
  DateTimeType,
  DateType,
  DecimalType,
  IntegerType,
  primitiveTypeMap,
  StringType,
  TimeType,
} from "../utils/type";
import { useProgramContext } from "../utils/store";
import { colors, distinct } from "../utils/misc";
import { Tag } from "@phosphor-icons/react";
import Dropdown from "./Dropdown";
import { mergeRefs } from "../utils/react";
import {
  ITypeToken,
  TokenComponentProps,
  TokenType,
  Type,
} from "../types/internal";
import { unparseTypeToken } from "../utils/fhirpath";
import { useStyle } from "../style";
import { useText } from "../text";

const TypeToken = forwardRef<HTMLElement, TokenComponentProps>(
  ({ bindingId, tokenIndex }, forwardedRef) => {
    const style = useStyle();
    const text = useText();
    const { token, updateToken, getFhirSchema } = useProgramContext(
      (state) => ({
        token: state.getToken(bindingId, tokenIndex) as ITypeToken,
        updateToken: state.updateToken,
        getFhirSchema: state.getFhirSchema,
      }),
    );

    const fhirSchema = getFhirSchema();
    const typesGroups: Record<string, Type[]> = useMemo(
      () => ({
        [text.token.type.groups.literalTypes]: [
          IntegerType,
          DecimalType,
          StringType,
          BooleanType,
          DateType,
          DateTimeType,
          TimeType,
        ],
        [text.token.type.groups.fhirPrimitiveTypes]: [
          ...Object.values(primitiveTypeMap),
        ],
        [text.token.type.groups.fhirComplexTypes]: distinct(
          Object.values(fhirSchema)
            .filter(
              (schema) =>
                schema.kind === "complex-type" &&
                schema.derivation !== "constraint",
            )
            .map((schema) => schema.id),
        )
          .sort()
          .map((id) => ComplexType([id])),
        [text.token.type.groups.fhirResourceTypes]: distinct(
          Object.values(fhirSchema)
            .filter(
              (schema) =>
                schema.kind === "resource" &&
                schema.derivation !== "constraint",
            )
            .map((schema) => schema.id),
        )
          .sort()
          .map((id) => ComplexType([id])),
      }),
      [fhirSchema, text.token.type.groups],
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
        colorFn={() => colors.literal}
        renderReference={(mergeProps, ref) => (
          <button
            ref={mergeRefs(forwardedRef as Ref<HTMLButtonElement>, ref)}
            {...mergeProps({ className: style.token.button })}
          >
            {unparseTypeToken(token)}
          </button>
        )}
        renderItem={(type) => (
          <>
            <span className={style.dropdown.icon}>
              <Tag size={14} />
            </span>
            <span className={style.dropdown.primary}>
              {unparseTypeToken({ type: TokenType.type, value: type })}
            </span>
          </>
        )}
      />
    );
  },
);

export default TypeToken;
