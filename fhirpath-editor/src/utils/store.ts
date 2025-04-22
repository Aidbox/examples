import { createContext, useContext } from "react";
import { createStore, StoreApi, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  getExpressionValue,
  extractReferencedBindings,
  generateBindingId,
  getExpressionType,
  getTransitiveDependencies,
  getTransitiveDependents,
  suggestNextTokens,
  suggestTokensAt,
  walkDependencyGraph,
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
  FhirValue,
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
import { castDraft, enableMapSet, WritableDraft } from "immer";
import type { ExtractState } from "zustand/vanilla";

enableMapSet();

const emptyProgram: IProgram = { bindings: [], expression: [] };

export interface IProgramStore {
  program: IProgram;
  overBindingId: string | undefined;
  bindingRefs: Record<string, IBindingRef | null>;
  bindingsIndex: Record<string, number>;
  tokenRefs: Record<string, Array<HTMLElement | null>>;
  bindingDependencies: Record<string, Set<string>>;
  bindingTypes: Record<string, IType>;
  bindingValues: Record<string, FhirValue>;

  getContext: () => IContext;
  getFhirSchema: () => IFhirRegistry;
  getQuestionnaireItems: () => QuestionnaireItemRegistry;
  getBindingExpression: (id: string | null) => IToken[];
  getBindingName: (id: string) => string;
  getExpressionType: (id: string | null, upToIndex?: number) => IType;
  getBindingType: (id: string | null) => IType;
  getBindingValue: (id: string | null) => FhirValue;
  updateBindingType: (...ids: Array<string | null>) => void;
  updateBindingValue: (...ids: Array<string | null>) => void;
  getBindableBindings: (id: string | null) => IBinding[];
  getDependingBindings: (id: string | null) => ILocalBinding[];
  getDependantBindingIds: (id: string | null) => Array<string | null>;
  getBindingTypes: () => Record<string, IType>;
  getBindingValues: () => Record<string, FhirValue>;
  getBindingsOrder: () => Record<string, number>;
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

export function ensureFhirValue<T extends { value: FhirValue }>(
  container: T & { value: FhirValue | any },
): T {
  return {
    ...container,
    value:
      container.value instanceof FhirValue
        ? container.value
        : new FhirValue(container.value),
  };
}

export const createProgramStore = (
  _context: IContext,
  _externalBindings: IExternalBinding[],
  _fhirSchema: IFhirSchema[] | IFhirRegistry,
): StoreApi<IProgramStore> => {
  const context = ensureFhirValue(_context);
  const externalBindings = _externalBindings.map(ensureFhirValue);

  const fhirSchema = Array.isArray(_fhirSchema)
    ? indexFhirSchemas(_fhirSchema)
    : _fhirSchema;

  const questionnaireItems = externalBindings.reduce((acc, binding) => {
    if (matchTypePattern(FhirType(["Questionnaire"]), binding.type))
      Object.assign(acc, getItems(binding.value.value));
    return acc;
  }, {} as QuestionnaireItemRegistry);

  return createStore(
    immer((_set, _get) => {
      let currentDraft: WritableDraft<IProgramStore> | undefined;
      const set = (updater: (state: WritableDraft<IProgramStore>) => void) => {
        if (currentDraft) {
          return updater(currentDraft);
        } else {
          _set((state) => {
            currentDraft = state;
            updater(state);
            currentDraft = undefined;
          });
        }
      };
      const get = (): IProgramStore | WritableDraft<IProgramStore> => {
        if (currentDraft) {
          return currentDraft;
        } else {
          return _get();
        }
      };

      return {
        program: emptyProgram,
        overBindingId: undefined,
        bindingRefs: {},
        bindingsIndex: {},
        tokenRefs: {},
        bindingDependencies: {},
        bindingTypes: {},
        bindingValues: {},

        getContext: () => context,

        getFhirSchema: () => fhirSchema,

        getQuestionnaireItems: () => questionnaireItems,

        getBindingExpression: (id) =>
          id
            ? get().program.bindings[get().bindingsIndex[id]]?.expression
            : get().program.expression,

        getBindingName: (id) =>
          get().program.bindings[get().bindingsIndex[id]].name,

        getBindableBindings: (id) => {
          const {
            program: { bindings },
            bindingDependencies,
          } = get();

          const dependants = id
            ? getTransitiveDependents(bindingDependencies, id)
            : undefined;

          const localBindings = dependants
            ? bindings.filter((b) => !dependants.has(b.id))
            : bindings;

          return [...externalBindings, ...localBindings];
        },

        getDependingBindings: (id) => {
          const {
            program: { bindings },
            bindingDependencies,
          } = get();

          const dependencies = id
            ? getTransitiveDependencies(bindingDependencies, id)
            : undefined;

          return dependencies
            ? bindings.filter((b) => dependencies.has(b.id))
            : bindings;
        },

        getDependantBindingIds: (id) => {
          return Array.from(
            getTransitiveDependents(get().bindingDependencies, id || ""),
          ).map((id) => id || null);
        },

        getExpressionType: (id, upToIndex) => {
          let expression = get().getBindingExpression(id).slice(0, upToIndex);
          if (!expression.length) return context.type;

          return getExpressionType(
            expression,
            get().getQuestionnaireItems(),
            get().getBindingTypes(),
            context.type,
            fhirSchema,
          );
        },

        getBindingType: (id) => {
          if (id === null) {
            return get().bindingTypes[""];
          } else {
            const index = get().bindingsIndex[`${id}`];
            if (index != null) {
              const binding = get().program.bindings[index];
              return get().bindingTypes[binding.name];
            } else {
              const externalBinding = externalBindings.find((b) => b.id === id);
              if (externalBinding) {
                return externalBinding.type;
              } else {
                throw new Error(`Binding ${id} not found`);
              }
            }
          }
        },

        getBindingValue: (id) => {
          if (id === null) {
            return get().bindingValues[""];
          } else {
            const index = get().bindingsIndex[`${id}`];
            if (index != null) {
              const binding = get().program.bindings[index];
              return get().bindingValues[binding.name];
            } else {
              const externalBinding = externalBindings.find((b) => b.id === id);
              if (externalBinding) {
                return externalBinding.value;
              } else {
                throw new Error(`Binding ${id} not found`);
              }
            }
          }
        },

        updateBindingType: (...ids) =>
          set((state) => {
            const seen = new Set<string | null>();
            const target = [];
            for (const id of ids) {
              if (seen.has(id)) continue;
              seen.add(id);
              target.push(id);

              for (const dependant of get().getDependantBindingIds(id)) {
                if (seen.has(dependant)) continue;
                seen.add(dependant);
                target.push(dependant);
              }
            }

            for (const id of target) {
              if (id) {
                const binding = state.program.bindings[state.bindingsIndex[id]];
                state.bindingTypes[binding.name] = getExpressionType(
                  binding.expression,
                  get().getQuestionnaireItems(),
                  get().getBindingTypes(),
                  context.type,
                  fhirSchema,
                );
              } else {
                state.bindingTypes[""] = getExpressionType(
                  state.program.expression,
                  get().getQuestionnaireItems(),
                  get().getBindingTypes(),
                  context.type,
                  fhirSchema,
                );
              }
            }
          }),

        updateBindingValue: (...ids) =>
          set((state) => {
            const seen = new Set<string | null>();
            const target = [];
            for (const id of ids) {
              if (seen.has(id)) continue;
              seen.add(id);
              target.push(id);

              for (const dependant of get().getDependantBindingIds(id)) {
                if (seen.has(dependant)) continue;
                seen.add(dependant);
                target.push(dependant);
              }
            }

            for (const id of target) {
              if (id) {
                const binding = state.program.bindings[state.bindingsIndex[id]];
                state.bindingValues[binding.name] = getExpressionValue(
                  binding.name,
                  binding.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                );
              } else {
                state.bindingValues[""] = getExpressionValue(
                  null,
                  state.program.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                );
              }
            }
          }),

        getBindingTypes: () => ({
          ...Object.fromEntries(externalBindings.map((b) => [b.name, b.type])),
          ...get().bindingTypes,
        }),

        getBindingValues: () => ({
          ...Object.fromEntries(externalBindings.map((b) => [b.name, b.value])),
          ...get().bindingValues,
        }),

        getBindingsOrder: () => {
          const order: Record<string, number> = {};
          let i = 0;
          walkDependencyGraph(get().bindingDependencies, (id) => {
            order[id || ""] = i++;
          });
          return order;
        },

        suggestNextTokens: (id) =>
          suggestNextTokens(
            get().getBindingExpression(id),
            get().getQuestionnaireItems(),
            get().getBindableBindings(id),
            get().getBindingTypes(),
            context.type,
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
            get().getBindableBindings(id),
            get().getBindingTypes(),
            context.type,
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
            // bindings changed
            if (typeof token === "function") {
              token(expression[index] as T);
            } else {
              Object.assign(expression[index], token);
            }
            state.bindingDependencies[`${id}`] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        addToken: (id, token, focus = true) =>
          set((state) => {
            const expression =
              id == null
                ? state.program.expression
                : state.program.bindings[state.bindingsIndex[id]].expression;

            // bindings changed
            expression.push(token);
            state.bindingDependencies[`${id}`] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
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
            // bindings changed
            expression.splice(index ?? expression.length - 1, 1);
            state.bindingDependencies[`${id}`] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
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

            // bindings changed
            if (typeof arg === "function") {
              arg(origin);
            } else {
              Object.assign(origin, arg);
            }

            state.bindingDependencies[`${id}`] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        deleteArg: (id, tokenIndex, argIndex) =>
          set((state) => {
            const expression =
              id == null
                ? state.program.expression
                : state.program.bindings[state.bindingsIndex[id]].expression;
            const token = expression[tokenIndex];
            if (token.type !== "function") {
              throw new Error("Token is not a function");
            }
            // bindings changed
            if (argIndex === token.args.length - 1) {
              token.args.pop();
            } else {
              token.args[argIndex] = undefined;
            }
            state.bindingDependencies[`${id}`] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
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
            // bindings changed
            state.program = program;
            state.bindingsIndex = buildPositionIndex(state.program.bindings);

            for (const binding of state.program.bindings) {
              state.bindingDependencies[`${binding.id}`] = new Set(
                extractReferencedBindings(
                  binding.expression,
                  state.program.bindings,
                ),
              );
            }

            state.bindingDependencies[""] = new Set(
              extractReferencedBindings(
                state.program.expression,
                state.program.bindings,
              ),
            );

            walkDependencyGraph(state.bindingDependencies, (id) => {
              if (id) {
                const binding = state.program.bindings[state.bindingsIndex[id]];

                state.bindingTypes[binding.name] = getExpressionType(
                  binding.expression,
                  get().getQuestionnaireItems(),
                  get().getBindingTypes(),
                  context.type,
                  fhirSchema,
                );

                state.bindingValues[binding.name] = getExpressionValue(
                  binding.name,
                  binding.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                );
              } else {
                state.bindingTypes[""] = getExpressionType(
                  state.program.expression,
                  get().getQuestionnaireItems(),
                  get().getBindingTypes(),
                  context.type,
                  fhirSchema,
                );

                state.bindingValues[""] = getExpressionValue(
                  null,
                  state.program.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                );
              }
            });
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
                  state.program.bindings[state.program.bindings.length - 1]
                    .name,
              },
            ];

            get().focusBinding(null);
          });
        },

        addBinding: (partial, afterIndex, focus = true) =>
          set((state) => {
            const index = afterIndex ?? state.program.bindings.length;
            let name = partial.name || "var0";

            while (state.program.bindings.find((b) => b.name === name)) {
              name = name.match(/\d+$/)
                ? name.replace(/\d+$/, (n) => `${+n + 1}`)
                : `${name}1`;
            }

            const binding = {
              ...partial,
              expression: partial?.expression || [],
              name,
              id: generateBindingId(),
            };
            // bindings changed
            state.program.bindings.splice(index, 0, binding);
            state.bindingsIndex = buildPositionIndex(state.program.bindings);
            state.bindingDependencies[`${binding.id}`] = new Set(
              extractReferencedBindings(
                binding.expression,
                state.program.bindings,
              ),
            );
            state.updateBindingType(binding.id);
            state.updateBindingValue(binding.id);

            if (focus) {
              delay(get().focusBinding.bind(null, binding.id));
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
            // bindings changed
            state.program.bindings.splice(index, 1);
            state.bindingsIndex = buildPositionIndex(state.program.bindings);
            const prevIndex = Math.max(0, index - 1);
            const focusId = state.program.bindings[prevIndex]?.id;

            const dependants = get().getDependantBindingIds(id);
            delete state.bindingDependencies[`${id}`];
            Object.values(state.bindingDependencies).forEach((dependencies) =>
              dependencies.delete(id),
            );
            state.updateBindingType(...dependants);
            state.updateBindingValue(...dependants);
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
      } as IProgramStore;
    }),
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
