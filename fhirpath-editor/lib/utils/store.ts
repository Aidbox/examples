import { createContext, useContext } from "react";
import { createStore, StoreApi, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  extractReferencedBindings,
  generateBindingId,
  getExpressionType,
  getExpressionValue,
  getTransitiveDependencies,
  getTransitiveDependents,
  suggestNextTokens,
  suggestTokensAt,
  walkDependencyGraph,
} from "./expression";
import { assertDefined, buildPositionIndex, delay } from "./misc";
import { useShallow } from "zustand/react/shallow";
import { ComplexType, matchTypePattern } from "./type";
import { getItems } from "./questionnaire";
import {
  Binding,
  BindingRef,
  Context,
  ExternalBinding,
  FhirRegistry,
  FhirValue,
  IProgram,
  LocalBinding,
  QuestionnaireItemRegistry,
  SuggestedToken,
  Token,
  TokenKind,
  Type,
} from "../types/internal";
import { castDraft, enableMapSet, WritableDraft } from "immer";
import type { ExtractState } from "zustand/vanilla";
import { Model } from "fhirpath";
import { functionMetadata, getArgumentContextType } from "./function.ts";

enableMapSet();

const emptyProgram: IProgram = { bindings: [], expression: [] };

export interface IProgramStore {
  program: IProgram;
  overBindingId: string | undefined;
  bindingRefs: Record<string, BindingRef | null>;
  bindingsIndex: Record<LocalBinding["id"], number>;
  tokenRefs: Record<string, Array<HTMLElement | null>>;
  bindingDependencies: Record<string, Set<string>>;
  bindingTypes: Record<LocalBinding["name"], Type>;
  bindingValues: Record<LocalBinding["name"], FhirValue>;

  getContext: () => Context;
  getFhirSchema: () => FhirRegistry;
  getModel: () => Model;
  getDebug: () => boolean;
  getPortalRoot: () => string | undefined;
  getAllowBindings: () => boolean;
  getIsLambda: () => boolean;
  getQuestionnaireItems: () => QuestionnaireItemRegistry;
  getBindingExpression: (id: string) => Token[];
  getBindingName: (id: string) => string;
  getExpressionType: (id: string, upToIndex: number) => Type;
  getExpressionValue: (id: string, upToIndex: number) => FhirValue;
  getBindingType: (id: string) => Type;
  getBindingValue: (id: string) => FhirValue;
  getBindingsOrder: () => Record<string, number>;
  updateBindingType: (...ids: Array<string>) => void;
  updateBindingValue: (...ids: Array<string>) => void;
  getBindableBindings: (id: string) => Binding[];
  getDependingBindings: (id: string) => LocalBinding[];
  getDependantBindingIds: (id: string) => Array<string>;
  getBindingTypes: () => Record<string, Type>;
  getBindingValues: () => Record<string, FhirValue>;
  suggestNextTokens: (id: string) => SuggestedToken[];
  suggestTokensAt: <T extends Token = Token>(
    id: string,
    index: number,
  ) => SuggestedToken<T>[];
  isBindingNameUnique: (name: string, excludeId?: string) => boolean;
  getToken: (id: string, index: number) => Token;
  isLeadingToken: (id: string, index: number) => boolean;
  updateToken: <T extends Token = Token>(
    id: string,
    index: number,
    token: Partial<T> | ((token: T) => void),
  ) => void;
  addToken: (id: string, token: Token, focus?: boolean) => void;
  deleteToken: (id: string, index?: number) => void;
  setTokenRef: (id: string, index: number, ref: HTMLElement | null) => void;
  focusToken: (id: string, index: number) => boolean;
  getArgContextType: (id: string, tokenIndex: number, argIndex: number) => Type;
  getArg: (id: string, tokenIndex: number, argIndex: number) => IProgram;
  updateArg: (
    id: string,
    tokenIndex: number,
    argIndex: number,
    arg: Partial<IProgram> | ((arg: IProgram) => void),
  ) => void;
  deleteArg: (id: string, tokenIndex: number, argIndex: number) => void;
  trimBinding: (id: string) => void;
  setProgram: (program: IProgram) => void;
  nameExpression: () => void;
  addBinding: (
    binding: Partial<LocalBinding>,
    afterIndex?: number,
    focus?: boolean,
  ) => void;
  duplicateBinding: (id: string) => void;
  deleteBinding: (id: string) => void;
  renameBinding: (id: string, name: string) => void;
  setBindingRef: (id: string, ref: BindingRef | null) => void;
  focusBinding: (id: string) => boolean;
}

export const createProgramStore = (
  context: Context,
  allowBindings: boolean,
  isLambda: boolean,
  externalBindings: ExternalBinding[],
  fhirSchema: FhirRegistry,
  model: Model,
  debug: boolean,
  portalRoot: string | undefined,
): StoreApi<IProgramStore> => {
  const questionnaireItems = externalBindings.reduce((acc, binding) => {
    if (matchTypePattern(ComplexType(["Questionnaire"]), binding.type))
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

        getModel: () => model,

        getQuestionnaireItems: () => questionnaireItems,

        getDebug: () => debug,

        getPortalRoot: () => portalRoot,

        getAllowBindings: () => allowBindings,

        getIsLambda: () => isLambda,

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
            ? bindings.filter((b) => !dependants.includes(b.id) && b.id !== id)
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
            getTransitiveDependents(get().bindingDependencies, id),
          ).map((id) => id);
        },

        getExpressionType: (id, upToIndex) => {
          const expression = get()
            .getBindingExpression(id)
            .slice(0, upToIndex + 1);
          if (!expression.length) return context.type;

          return getExpressionType(
            expression,
            get().getQuestionnaireItems(),
            get().getBindingTypes(),
            context.type,
            fhirSchema,
          );
        },

        getExpressionValue: (id, upToIndex) => {
          const expression = get()
            .getBindingExpression(id)
            .slice(0, upToIndex + 1);
          if (!expression.length) return context.value;

          return getExpressionValue(
            null,
            get().getIsLambda(),
            expression,
            get().getBindingValues(),
            get().getQuestionnaireItems(),
            context.value,
            model,
          );
        },

        getBindingType: (id) => {
          if (!id) {
            return get().bindingTypes[""];
          } else {
            const index = get().bindingsIndex[id];
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
          if (!id) {
            return get().bindingValues[""];
          } else {
            const index = get().bindingsIndex[id];
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

        getBindingsOrder: () => {
          const order: Record<string, number> = {};
          let i = 0;
          walkDependencyGraph(get().bindingDependencies, (id) => {
            order[id || ""] = i++;
          });
          return order;
        },

        updateBindingType: (...ids) =>
          set((state) => {
            const seen = new Set<string>();
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
            const seen = new Set<string>();
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
                  get().getIsLambda(),
                  binding.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                  model,
                );
              } else {
                state.bindingValues[""] = getExpressionValue(
                  null,
                  get().getIsLambda(),
                  state.program.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                  model,
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

        suggestNextTokens: (id) =>
          suggestNextTokens(
            get().getIsLambda(),
            get().getBindingExpression(id),
            get().getQuestionnaireItems(),
            get().getBindableBindings(id),
            get().getBindingTypes(),
            context.type,
            fhirSchema,
          ),

        suggestTokensAt: <T extends Token = Token>(id: string, index: number) =>
          suggestTokensAt<T>(
            index,
            get().getIsLambda(),
            get().getBindingExpression(id),
            get().getQuestionnaireItems(),
            get().getBindableBindings(id),
            get().getBindingTypes(),
            context.type,
            fhirSchema,
          ),

        isBindingNameUnique: (name, excludeId) => {
          return ![...get().program.bindings, ...externalBindings].some(
            (b: Binding) => b.id !== excludeId && b.name === name,
          );
        },

        getToken: (id, index) => {
          const expression = !id
            ? get().program.expression
            : get().program.bindings[get().bindingsIndex[id]].expression;
          return expression[index];
        },

        isLeadingToken: (id, index) => {
          if (index === 0) return true;
          const expression = !id
            ? get().program.expression
            : get().program.bindings[get().bindingsIndex[id]].expression;
          return expression[index - 1].kind === TokenKind.operator;
        },

        updateToken: <T extends Token = Token>(
          id: string,
          index: number,
          token: Partial<T> | ((token: T) => void),
        ) =>
          set((state) => {
            const expression = !id
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
            state.bindingDependencies[id] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        addToken: (id, token, focus = true) =>
          set((state) => {
            const expression = !id
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;

            // bindings changed
            expression.push(token);
            state.bindingDependencies[id] = new Set(
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
            const expression = !id
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;
            // bindings changed
            expression.splice(index ?? expression.length - 1, 1);
            state.bindingDependencies[id] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        setTokenRef: (id, index, ref) =>
          set((state) => {
            if (!state.tokenRefs[id]) {
              state.tokenRefs[id] = [];
            }
            state.tokenRefs[id][index] = castDraft(ref);
          }),

        focusToken: (id, index) => {
          const ref = get().tokenRefs[id][index];
          ref?.focus();
          return ref != null;
        },

        getArgContextType: (id, tokenIndex, argIndex) => {
          const token = get().getToken(id, tokenIndex);
          if (token.kind !== TokenKind.function) {
            throw new Error("Token is not a function");
          }

          const meta = functionMetadata.find((f) => f.name === token.value);
          assertDefined(meta, `Function ${token.value} metadata not found`);

          const inputType = get().getExpressionType(id, tokenIndex - 1);

          const questionnaireItems = get().getQuestionnaireItems();
          const bindingTypes = get().getBindingTypes();

          return getArgumentContextType(
            argIndex,
            meta.name,
            inputType,
            context.type,
            (argIndex: number, contextType: Type) =>
              token.args[argIndex]
                ? getExpressionType(
                    token.args[argIndex].expression,
                    questionnaireItems,
                    bindingTypes, // consider: merge types of token.args[argIndex].bindings
                    contextType,
                    fhirSchema,
                  )
                : undefined,
          );
        },

        getArg: (id, tokenIndex, argIndex) => {
          const token = get().getToken(id, tokenIndex);
          if (token.kind !== TokenKind.function) {
            throw new Error("Token is not a function");
          }
          return token.args[argIndex] || emptyProgram;
        },

        updateArg: (id, tokenIndex, argIndex, arg) =>
          set((state) => {
            const expression = !id
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;

            const token = expression[tokenIndex];

            if (token.kind !== TokenKind.function) {
              throw new Error("Token is not a function");
            }

            if (argIndex >= token.args.length) {
              token.args.push(
                ...Array(argIndex - token.args.length + 1).fill(
                  structuredClone(emptyProgram),
                ),
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

            state.bindingDependencies[id] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        deleteArg: (id, tokenIndex, argIndex) =>
          set((state) => {
            const expression = !id
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;
            const token = expression[tokenIndex];
            if (token.kind !== TokenKind.function) {
              throw new Error("Token is not a function");
            }
            // bindings changed
            if (argIndex === token.args.length - 1) {
              token.args.pop();
            } else {
              token.args[argIndex] = undefined;
            }
            state.bindingDependencies[id] = new Set(
              extractReferencedBindings(expression, state.program.bindings),
            );
            state.updateBindingType(id);
            state.updateBindingValue(id);
          }),

        trimBinding: (id) => {
          if (get().getBindingExpression(id).length > 0) {
            get().deleteToken(id);
          } else if (id) {
            get().deleteBinding(id);
          }
        },

        setProgram: (program) =>
          set((state) => {
            // bindings changed
            state.program = program;
            state.bindingDependencies = {};
            state.bindingTypes = {};
            state.bindingValues = {};
            state.bindingsIndex = buildPositionIndex(state.program.bindings);

            for (const binding of state.program.bindings) {
              state.bindingDependencies[binding.id] = new Set(
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
                  get().getIsLambda(),
                  binding.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                  model,
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
                  get().getIsLambda(),
                  state.program.expression,
                  get().getBindingValues(),
                  get().getQuestionnaireItems(),
                  context.value,
                  model,
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
                kind: TokenKind.variable,
                value:
                  state.program.bindings[state.program.bindings.length - 1]
                    .name,
              },
            ];

            get().focusBinding("");
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
            state.bindingDependencies[binding.id] = new Set(
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
            delete state.bindingDependencies[id];
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
              const fixReferences = (expression: Token[]) => {
                for (const token of expression) {
                  if (
                    token.kind === TokenKind.variable &&
                    !token.special &&
                    token.value === binding.name
                  ) {
                    token.value = name;
                  } else if (token.kind === TokenKind.function) {
                    for (const arg of token.args) {
                      if (arg) {
                        let shadowed = false;
                        for (const innerBinding of arg.bindings) {
                          if (innerBinding.name === binding.name) {
                            shadowed = true;
                            break;
                          } else {
                            fixReferences(arg.expression);
                          }
                        }
                        if (!shadowed) {
                          fixReferences(arg.expression);
                        }
                      }
                    }
                  }
                }
              };

              state.program.bindings.forEach((b, i) => {
                if (i !== state.bindingsIndex[id]) fixReferences(b.expression);
              });

              state.bindingTypes[name] = state.bindingTypes[binding.name];
              delete state.bindingTypes[binding.name];

              state.bindingValues[name] = state.bindingValues[binding.name];
              delete state.bindingValues[binding.name];

              fixReferences(state.program.expression);
              binding.name = name;
            }
          }),

        setBindingRef: (id, ref) =>
          set((state) => {
            if (ref) state.bindingRefs[id] = castDraft(ref);
            else {
              delete state.bindingRefs[id];
              delete state.tokenRefs[id];
            }
          }),

        focusBinding: (id) => {
          const ref = get().bindingRefs[id];
          ref?.focus();
          return ref != null;
        },
      } satisfies IProgramStore;
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
