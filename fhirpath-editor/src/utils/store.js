import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  evaluateExpression,
  findCompatibleBindings,
  generateBindingId,
  getExpressionType,
  suggestNextToken,
} from "@utils/expression.js";
import { delay } from "@utils/misc.js";
import { useShallow } from "zustand/react/shallow";
import { pick } from "./misc";
import { StringType } from "@utils/type.js";
import { indexFhirSchemas } from "@utils/fhir.js";

const emptyProgram = { bindings: [], expression: [] };

const buildIndex = (objects) =>
  objects.reduce((acc, obj, index) => {
    acc[obj.id] = index;
    return acc;
  }, {});

export const createProgramStore = (
  contextValue,
  contextType,
  externalBindings,
  rawFhirSchema,
) => {
  const fhirSchema = Array.isArray(rawFhirSchema)
    ? indexFhirSchemas(rawFhirSchema)
    : rawFhirSchema;

  return createStore(
    immer((set, get) => ({
      program: emptyProgram,
      overBindingId: undefined,
      bindingRefs: {},
      bindingsIndex: {},
      tokenRefs: {},
      contextValue,

      getContextType: () => contextType,

      getFhirSchema: () => fhirSchema,

      getBindingExpression: (id) =>
        id
          ? get().program.bindings[get().bindingsIndex[id]]?.expression
          : get().program.expression,

      getBindingName: (id) =>
        id && get().program.bindings[get().bindingsIndex[id]].name,

      getPrecedingBindings: (id) => {
        const index = get().bindingsIndex[id];
        return [...externalBindings, ...get().program.bindings.slice(0, index)];
      },

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
        const index = get().bindingsIndex[id];
        const knownBindings = Object.fromEntries(
          get()
            .program.bindings.slice(0, index)
            .map((binding) => [binding.name, binding.id]),
        );

        function walk(expression) {
          return expression
            .flatMap((token) => {
              if (token.type === "variable") {
                const id = knownBindings[token.value];
                return id ? [id] : [];
              } else if (token.type === "function") {
                return token.args.flatMap((arg) => [
                  ...walk(arg.expression),
                  ...arg.bindings.flatMap((binding) =>
                    walk(binding.expression),
                  ),
                ]);
              }
            })
            .filter(Boolean);
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
          const index = get().bindingsIndex[id];
          const deps = get().getBindingDependencies(id);

          return evaluateExpression(
            expression,
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

      suggestNextToken: (id) => {
        const expression = get().getBindingExpression(id);
        const precedingBindings = get().getPrecedingBindings(id);
        return suggestNextToken(
          expression,
          precedingBindings,
          contextType,
          fhirSchema,
        );
      },

      getCompatibleBindings: (id, upToIndex) => {
        let expression = get().getBindingExpression(id) || [];
        expression = expression.slice(0, upToIndex);

        return findCompatibleBindings(
          expression,
          get().getPrecedingBindings(id),
          contextType,
          fhirSchema,
        );
      },

      isBindingNameUnique: (name, excludeId) =>
        !get()
          .program.bindings.concat(externalBindings)
          .some((b) => b.id !== excludeId && b.name === name),

      getToken: (id, index) => {
        const expression =
          id == null
            ? get().program.expression
            : get().program.bindings[get().bindingsIndex[id]].expression;
        return expression[index];
      },

      updateToken: (id, index, token) =>
        set((state) => {
          const expression =
            id == null
              ? state.program.expression
              : state.program.bindings[state.bindingsIndex[id]].expression;
          if (!expression[index]) {
            throw new Error("Token not found");
          }
          if (typeof token === "function") {
            token(expression[index]);
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

          const now = new Date();

          if (token.value === undefined) {
            if (token.type === "string") {
              token.value = "";
            } else if (token.type === "number") {
              token.value = "";
            } else if (token.type === "boolean") {
              token.value = "true";
            } else if (token.type === "date") {
              token.value = now.toISOString().split("T")[0];
            } else if (token.type === "datetime") {
              token.value = now.toISOString().slice(0, 16);
            } else if (token.type === "time") {
              token.value = now.toTimeString().slice(0, 5);
            } else if (token.type === "type") {
              token.value = StringType;
            } else if (token.type === "index") {
              token.value = "0";
            } else if (token.type === "quantity") {
              token.value = { value: "", unit: "seconds" };
            }
          }

          if (token.type === "function" && !token.args) {
            token.args = []; //
          }

          expression.push(pick(token, ["type", "value", "args"]));

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
          if (!state.tokenRefs[id]) {
            state.tokenRefs[id] = [];
          }
          state.tokenRefs[id][index] = ref;
        }),

      focusToken: (id, index) => {
        const ref = get().tokenRefs[id][index];
        ref?.focus();
        return ref != null;
      },

      getArg: (id, tokenIndex, argIndex) => {
        const token = get().getToken(id, tokenIndex);
        if (token.type !== "function") {
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
              ...Array(argIndex - token.args.length + 1).fill({}),
            );
          }
          if (typeof arg === "function") {
            arg(token.args[argIndex]);
          } else {
            Object.assign(token.args[argIndex], arg);
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
          state.bindingsIndex = buildIndex(state.program.bindings);
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
              type: "variable",
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
          let name = binding.name;

          while (state.program.bindings.find((b) => b.name === name)) {
            name = name.match(/\d+$/)
              ? name.replace(/\d+$/, (n) => +n + 1)
              : `${name}1`;
          }

          state.program.bindings.splice(index, 0, {
            ...binding,
            expression: binding?.expression || [],
            name,
            id: generateBindingId(),
          });
          state.bindingsIndex = buildIndex(state.program.bindings);

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
          state.bindingsIndex = buildIndex(state.program.bindings);
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
            const fixReferences = (expression) => {
              for (const token of expression) {
                if (token.type === "variable" && token.value === binding.name) {
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
          if (ref) state.bindingRefs[id] = ref;
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
    })),
  );
};

export const ProgramContext = createContext(null);

export function useProgramContext(selector) {
  const store = useContext(ProgramContext);
  if (!store) throw new Error("Missing ProgramContext.Provider in the tree");
  return useStore(store, useShallow(selector));
}
