import { createContext, useContext } from "react";
import { createStore, StoreApi, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  evaluateExpression,
  generateBindingId,
  getExpressionType,
  suggestNextTokens,
  suggestTokensAt,
} from "@/utils/expression";
import { assertDefined, buildPositionIndex, delay } from "@/utils/misc";
import { useShallow } from "zustand/react/shallow";
import { matchTypePattern } from "@/utils/type";
import {
  FhirType,
  IFhirRegistry,
  IFhirSchema,
  indexFhirSchemas,
} from "@/utils/fhir";
import { getItems, QuestionnaireItemRegistry } from "@/utils/questionnaire";
import {
  IBinding,
  IBindingRef,
  IContext,
  IExternalBinding,
  ILocalBinding,
  IProgram,
  ISuggestedToken,
  IToken,
  IType,
  TokenType,
} from "@/types/internal";
import { castDraft } from "immer";
import type { ExtractState } from "zustand/vanilla";

const emptyProgram: IProgram = { bindings: [], expression: [] };

export interface IProgramStore {
  program: IProgram;
  overBindingId: string | undefined;
  bindingRefs: Record<string, IBindingRef | null>;
  bindingsIndex: Record<string, number>;
  tokenRefs: Record<string, Array<HTMLElement | null>>;

  getContextType: () => IContext["type"];
  getFhirSchema: () => IFhirRegistry;
  getQuestionnaireItems: () => QuestionnaireItemRegistry;
  getBindingExpression: (id: string | null) => IToken[];
  getBindingName: (id: string) => string;
  getPrecedingBindings: (id: string | null) => IBinding[];
  getBindingExpressionType: (id: string | null, upToIndex?: number) => IType;
  getBindingDependencies: (
    id: string | null,
    seen?: Set<string | null>,
  ) => string[];
  getBindingValue: (id: string | null) => any;
  suggestNextTokens: (id: string | null) => ISuggestedToken[];
  suggestTokensAt: <T extends IToken = IToken>(
    id: string | null,
    index: number,
  ) => ISuggestedToken<T>[];
  isBindingNameUnique: (name: string, excludeId?: string | null) => boolean;
  getToken: (id: string | null, index: number) => IToken;
  isLeadingToken: (id: string | null, index: number) => boolean;
  updateToken: <T extends IToken = IToken>(
    id: string | null,
    index: number,
    token: Partial<T> | ((token: T) => void),
  ) => void;
  addToken: (id: string | null, token: IToken, focus?: boolean) => void;
  deleteToken: (id: string | null, index?: number) => void;
  setTokenRef: (
    id: string | null,
    index: number,
    ref: HTMLElement | null,
  ) => void;
  focusToken: (id: string | null, index: number) => boolean;
  getArg: (id: string | null, tokenIndex: number, argIndex: number) => IProgram;
  updateArg: (
    id: string | null,
    tokenIndex: number,
    argIndex: number,
    arg: Partial<IProgram> | ((arg: IProgram) => void),
  ) => void;
  deleteArg: (id: string | null, tokenIndex: number, argIndex: number) => void;
  trimBinding: (id: string | null) => void;
  setProgram: (program: IProgram) => void;
  nameExpression: () => void;
  addBinding: (
    binding: Partial<ILocalBinding>,
    afterIndex?: number,
    focus?: boolean,
  ) => void;
  duplicateBinding: (id: string) => void;
  deleteBinding: (id: string) => void;
  renameBinding: (id: string, name: string) => void;
  setBindingRef: (id: string | null, ref: IBindingRef | null) => void;
  focusBinding: (id: string | null) => boolean;
}

export const createProgramStore = (
  contextValue: IContext["value"],
  contextType: IContext["type"],
  externalBindings: IExternalBinding[],
  rawFhirSchema: IFhirSchema[] | IFhirRegistry,
): StoreApi<IProgramStore> => {
  const fhirSchema = Array.isArray(rawFhirSchema)
    ? indexFhirSchemas(rawFhirSchema)
    : rawFhirSchema;

  const questionnaireItems = externalBindings.reduce((acc, binding) => {
    if (matchTypePattern(FhirType(["Questionnaire"]), binding.type))
      Object.assign(acc, getItems(binding.value));
    return acc;
  }, {} as QuestionnaireItemRegistry);

  return createStore<IProgramStore>()(
    immer((set, get) => ({
      program: emptyProgram,
      overBindingId: undefined,
      bindingRefs: {},
      bindingsIndex: {},
      tokenRefs: {},

      getContextType: () => contextType,

      getFhirSchema: () => fhirSchema,

      getQuestionnaireItems: () => questionnaireItems,

      getBindingExpression: (id) =>
        id
          ? get().program.bindings[get().bindingsIndex[id]]?.expression
          : get().program.expression,

      getBindingName: (id) =>
        get().program.bindings[get().bindingsIndex[id]].name,

      getPrecedingBindings: (id) => {
        const index = get().bindingsIndex[`${id}`];
        return [...externalBindings, ...get().program.bindings.slice(0, index)];
      },

      // todo: rename to getBindingType
      getBindingExpressionType: (id, upToIndex) => {
        let expression = get().getBindingExpression(id);

        if (!expression) {
          const externalBinding = externalBindings.find(
            (binding) => binding.id === id,
          );
          if (externalBinding) {
            return externalBinding.type;
          } else {
            expression = [];
          }
        }

        if (upToIndex != null) expression = expression.slice(0, upToIndex);
        if (upToIndex != null && !expression.length) return contextType;

        return getExpressionType(
          expression,
          get().getQuestionnaireItems(),
          get().getPrecedingBindings(id),
          contextType,
          fhirSchema,
        );
      },

      getBindingDependencies: (id, seen = undefined) => {
        if (seen?.has(id)) return [];
        seen = seen || new Set();
        seen.add(id);

        const expression = get().getBindingExpression(id);
        const index = get().bindingsIndex[`${id}`];
        const knownBindings = Object.fromEntries(
          get()
            .program.bindings.slice(0, index)
            .map((binding) => [binding.name, binding.id]),
        );

        function walk(expression: IToken[]): string[] {
          return expression.flatMap((token) => {
            if (token.type === TokenType.variable) {
              const id = knownBindings[token.value];
              return id ? [id] : [];
            } else if (token.type === TokenType.function) {
              return token.args.flatMap((arg) =>
                arg
                  ? [
                      ...walk(arg.expression),
                      ...arg.bindings.flatMap((binding) =>
                        walk(binding.expression),
                      ),
                    ]
                  : [],
              );
            } else {
              return [];
            }
          });
        }

        const directDependencies = walk(expression);

        return [
          ...directDependencies,
          ...directDependencies.flatMap((id) =>
            get().getBindingDependencies(id, seen),
          ),
        ];
      },

      getBindingValue: (id) => {
        try {
          const expression = get().getBindingExpression(id);
          const index = get().bindingsIndex[`${id}`];
          const deps = get().getBindingDependencies(id);

          return evaluateExpression(
            expression,
            get().getQuestionnaireItems(),
            get()
              .program.bindings.slice(0, index)
              .filter((binding) => deps.includes(binding.id)),
            contextValue,
            externalBindings,
          );
        } catch (error) {
          return error;
        }
      },

      suggestNextTokens: (id) =>
        suggestNextTokens(
          get().getBindingExpression(id),
          get().getQuestionnaireItems(),
          get().getPrecedingBindings(id),
          contextType,
          fhirSchema,
        ),

      suggestTokensAt: <T extends IToken = IToken>(
        id: string | null,
        index: number,
      ) =>
        suggestTokensAt<T>(
          index,
          get().getBindingExpression(id),
          get().getQuestionnaireItems(),
          get().getPrecedingBindings(id),
          contextType,
          fhirSchema,
        ),

      isBindingNameUnique: (name, excludeId) => {
        return ![...get().program.bindings, ...externalBindings].some(
          (b: IBinding) => b.id !== excludeId && b.name === name,
        );
      },

      getToken: (id, index) => {
        const expression =
          id == null
            ? get().program.expression
            : get().program.bindings[get().bindingsIndex[id]].expression;
        return expression[index];
      },

      isLeadingToken: (id, index) => {
        if (index === 0) return true;
        const expression =
          id == null
            ? get().program.expression
            : get().program.bindings[get().bindingsIndex[id]].expression;
        return expression[index - 1].type === "operator";
      },

      updateToken: <T extends IToken = IToken>(
        id: string | null,
        index: number,
        token: Partial<T> | ((token: T) => void),
      ) =>
        set((state) => {
          const expression =
            id == null
              ? castDraft(state.program.expression)
              : state.program.bindings[state.bindingsIndex[id]].expression;
          if (!expression[index]) {
            throw new Error("Token not found");
          }
          if (typeof token === "function") {
            token(expression[index] as T);
          } else {
            Object.assign(expression[index], token);
          }
        }),

      addToken: (id, token, focus = true) =>
        set((state) => {
          const expression =
            id == null
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;

          expression.push(token);
          if (focus) {
            delay(get().focusToken.bind(null, id, expression.length - 1));
          }
        }),

      deleteToken: (id, index) =>
        set((state) => {
          const expression =
            id == null
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;
          expression.splice(index ?? expression.length - 1, 1);
        }),

      setTokenRef: (id, index, ref) =>
        set((state) => {
          if (!state.tokenRefs[`${id}`]) {
            state.tokenRefs[`${id}`] = [];
          }
          state.tokenRefs[`${id}`][index] = castDraft(ref);
        }),

      focusToken: (id, index) => {
        const ref = get().tokenRefs[`${id}`][index];
        ref?.focus();
        return ref != null;
      },

      getArg: (id, tokenIndex, argIndex) => {
        const token = get().getToken(id, tokenIndex);
        if (token.type !== TokenType.function) {
          throw new Error("Token is not a function");
        }
        return token.args[argIndex] || emptyProgram;
      },

      updateArg: (id, tokenIndex, argIndex, arg) =>
        set((state) => {
          const expression =
            id == null
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;

          const token = expression[tokenIndex];

          if (token.type !== "function") {
            throw new Error("Token is not a function");
          }

          if (argIndex >= token.args.length) {
            token.args.push(
              ...Array(argIndex - token.args.length + 1).fill(emptyProgram),
            );
          }
          const origin = token.args[argIndex];
          assertDefined(origin, "Origin must be defined");

          if (typeof arg === "function") {
            arg(origin);
          } else {
            Object.assign(origin, arg);
          }
        }),

      deleteArg: (id, tokenIndex, argIndex) =>
        set((state) => {
          const token = state.getToken(id, tokenIndex);
          if (token.type !== "function") {
            throw new Error("Token is not a function");
          }
          if (argIndex === token.args.length - 1) {
            token.args.pop();
          } else {
            token.args[argIndex] = undefined;
          }
        }),

      trimBinding: (id) => {
        if (get().getBindingExpression(id).length > 0) {
          get().deleteToken(id);
        } else if (id != null) {
          get().deleteBinding(id);
        }
      },

      setProgram: (program) =>
        set((state) => {
          state.program = program;
          state.bindingsIndex = buildPositionIndex(state.program.bindings);
        }),

      nameExpression: () => {
        get().addBinding(
          {
            name: "var1",
            expression: get().program.expression,
          },
          undefined,
          false,
        );
        set((state) => {
          state.program.expression = [
            {
              type: TokenType.variable,
              value:
                state.program.bindings[state.program.bindings.length - 1].name,
            },
          ];

          get().focusBinding(null);
        });
      },

      addBinding: (binding, afterIndex, focus = true) =>
        set((state) => {
          const index = afterIndex ?? state.program.bindings.length;
          let name = binding.name || "var0";

          while (state.program.bindings.find((b) => b.name === name)) {
            name = name.match(/\d+$/)
              ? name.replace(/\d+$/, (n) => `${+n + 1}`)
              : `${name}1`;
          }

          state.program.bindings.splice(index, 0, {
            ...binding,
            expression: binding?.expression || [],
            name,
            id: generateBindingId(),
          });
          state.bindingsIndex = buildPositionIndex(state.program.bindings);

          if (focus) {
            delay(
              get().focusBinding.bind(null, state.program.bindings[index].id),
            );
          }
        }),

      duplicateBinding: (id) => {
        const index = get().bindingsIndex[id];
        const binding = get().program.bindings[index];
        get().addBinding(
          { ...binding, name: `${binding.name} copy` },
          index + 1,
        );
      },

      deleteBinding: (id) =>
        set((state) => {
          const index = state.bindingsIndex[id];
          state.program.bindings.splice(index, 1);
          state.bindingsIndex = buildPositionIndex(state.program.bindings);
          const prevIndex = Math.max(0, index - 1);
          const focusId = state.program.bindings[prevIndex]?.id;
          if (focusId) {
            delay(get().focusBinding.bind(null, focusId));
          }
        }),

      renameBinding: (id, name) =>
        set((state) => {
          const binding = state.program.bindings[state.bindingsIndex[id]];
          const changed = name !== binding.name;

          if (
            changed &&
            name.length &&
            !state.program.bindings.some((b) => b.name === name) &&
            !externalBindings.some((b) => b.name === name)
          ) {
            const fixReferences = (expression: IToken[]) => {
              for (const token of expression) {
                if (
                  token.type === TokenType.variable &&
                  token.value === binding.name
                ) {
                  token.value = name;
                }
              }
            };

            state.program.bindings.forEach((b, i) => {
              if (i !== state.bindingsIndex[id]) fixReferences(b.expression);
            });
            fixReferences(state.program.expression);
            binding.name = name;
          }
        }),

      setBindingRef: (id, ref) =>
        set((state) => {
          if (ref) state.bindingRefs[`${id}`] = castDraft(ref);
          else {
            delete state.bindingRefs[`${id}`];
            delete state.tokenRefs[`${id}`];
          }
        }),

      focusBinding: (id) => {
        const ref = get().bindingRefs[`${id}`];
        ref?.focus();
        return ref != null;
      },
    })),
  ) as StoreApi<IProgramStore>;
};

export const ProgramContext = createContext<StoreApi<IProgramStore> | null>(
  null,
);

export function useProgramContext<U>(
  selector: (state: ExtractState<StoreApi<IProgramStore>>) => U,
): U {
  const store = useContext(ProgramContext);
  if (!store) throw new Error("Missing ProgramContext.Provider in the tree");
  return useStore(store, useShallow(selector));
}
