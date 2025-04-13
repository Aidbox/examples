import { createContext, useContext, useEffect, useRef } from "react";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  canMoveBinding,
  findCompatibleOperators,
  findCompatibleVariables,
  generateBindingId,
  getExpressionType,
  suggestNextToken,
} from "@utils/expression.js";
import { delay } from "@utils/misc.js";
import { useShallow } from "zustand/react/shallow";

const emptyProgram = { bindings: [], expression: [] };

const buildIndex = (objects) =>
  objects.reduce((acc, obj, index) => {
    acc[obj.id] = index;
    return acc;
  }, {});

const createProgramStore = (contextType, externalBindings) => {
  return createStore(
    immer((set, get) => ({
      program: emptyProgram,
      draggingBindingId: undefined,
      overBindingId: undefined,
      isValidBindingDrag: true,
      isBindingDraggingUp: false,
      bindingNameWidth: "auto",
      bindingRefs: {},
      bindingsIndex: {},
      tokenRefs: {},

      getContextType: () => contextType,

      getBindingExpression: (id) =>
        id
          ? get().program.bindings[get().bindingsIndex[id]].expression
          : get().program.expression,

      getBindingName: (id) =>
        id && get().program.bindings[get().bindingsIndex[id]].name,

      getPrecedingBindings: (id) => {
        const index = get().bindingsIndex[id];
        return [...externalBindings, ...get().program.bindings.slice(0, index)];
      },

      getBindingExpressionType: (id, upToIndex) => {
        let expression = get().getBindingExpression(id) || [];
        if (upToIndex != null) expression = expression.slice(0, upToIndex);
        if (upToIndex != null && !expression.length) return contextType;

        return getExpressionType(
          expression,
          get().getPrecedingBindings(id),
          contextType,
        );
      },

      suggestNextToken: (id) => {
        const expression = get().getBindingExpression(id);
        const precedingBindings = get().getPrecedingBindings(id);
        return suggestNextToken(expression, precedingBindings, contextType);
      },

      getCompatibleVariables: (id, upToIndex) => {
        let expression = get().getBindingExpression(id) || [];
        expression = expression.slice(0, upToIndex);

        return findCompatibleVariables(
          expression,
          get().getPrecedingBindings(id),
          contextType,
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

          const precedingBindings = get().getPrecedingBindings(id);
          const now = new Date();

          if (token.value === undefined) {
            if (token.type === "variable") {
              token.value =
                findCompatibleVariables(
                  expression,
                  precedingBindings,
                  contextType,
                )[0]?.name || "";
            } else if (token.type === "string") {
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
              token.value = "String";
            } else if (token.type === "index") {
              token.value = "0";
            } else if (token.type === "quantity") {
              token.value = { value: "", unit: "seconds" };
            } else if (token.type === "operator") {
              token.value =
                findCompatibleOperators(
                  expression,
                  precedingBindings,
                  contextType,
                )[0] || "+";
            }
          }

          if (token.type === "function" && !token.args) {
            token.args = []; //
          }

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
          for (const binding of state.program.bindings) {
            if (!binding.id) {
              binding.id = generateBindingId();
            }
          }
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
          const focusId = state.program.bindings[prevIndex].id;
          delay(get().focusBinding.bind(null, focusId));
        }),

      renameBinding: (id, name) =>
        set((state) => {
          const binding = state.program.bindings[state.bindingsIndex[id]];
          const changed = name !== binding.name;

          if (
            changed &&
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

      handleBindingDragStart: (id) =>
        set((state) => {
          state.draggingBindingId = id;
          state.isValidBindingDrag = true;
          state.bindingNameWidth =
            state.bindingRefs[state.draggingBindingId]?.width || "auto";
        }),

      handleBindingDragOver: (id) =>
        set((state) => {
          const changed = state.overBindingId !== id;
          state.overBindingId = id;

          if (changed) {
            if (!state.overBindingId) {
              state.isValidBindingDrag = true;
            } else {
              const oldIndex = state.bindingsIndex[state.draggingBindingId];
              const newIndex = state.bindingsIndex[state.overBindingId];
              state.isBindingDraggingUp = newIndex < oldIndex;
              state.isValidBindingDrag = canMoveBinding(
                state.program.bindings,
                oldIndex,
                newIndex,
              );
            }
          }
        }),

      handleBindingDragCancel: () =>
        set((state) => {
          state.draggingBindingId = undefined;
          state.overBindingId = undefined;
        }),

      handleBindingDragEnd: () =>
        set((state) => {
          if (
            state.overBindingId &&
            state.draggingBindingId !== state.overBindingId
          ) {
            const oldIndex = state.bindingsIndex[state.draggingBindingId];
            const newIndex = state.bindingsIndex[state.overBindingId];
            if (canMoveBinding(state.program.bindings, oldIndex, newIndex)) {
              const [movedItem] = state.program.bindings.splice(oldIndex, 1);
              state.program.bindings.splice(newIndex, 0, movedItem);
              state.bindingsIndex = buildIndex(state.program.bindings);
            }
          }

          state.draggingBindingId = undefined;
          state.overBindingId = undefined;
        }),
    })),
  );
};

const ProgramContext = createContext(null);

export function ProgramProvider({
  program,
  onProgramChange,
  contextType,
  externalBindings,
  children,
}) {
  const store = useRef(null);

  if (!store.current) {
    store.current = createProgramStore(contextType, externalBindings);
  }

  useEffect(() => {
    if (store.current) {
      return store.current.subscribe((curState, prevState) => {
        if (curState.program !== prevState.program) {
          onProgramChange(curState.program);
        }
      });
    }
  }, [onProgramChange]);

  useEffect(() => {
    if (store.current) {
      store.current.getState().setProgram(program);
    }
  }, [program]);

  return (
    <ProgramContext.Provider value={store.current}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgramContext(selector) {
  const store = useContext(ProgramContext);
  if (!store) throw new Error("Missing BearContext.Provider in the tree");
  return useStore(store, useShallow(selector));
}
