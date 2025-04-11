import React from "react";
import { useProgramContext } from "@utils/store.jsx";

const IndexToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));

  const empty = token.value === undefined || token.value === "";

  return (
    <label className="flex items-center focus-within:bg-gray-100 hover:outline hover:outline-gray-300 px-1 py-0.5 rounded data-empty:outline data-empty:not-hover:outline-dashed data-empty:outline-gray-300 gap-[0.125rem] text-teal-800">
      <span>[</span>
      <input
        ref={ref}
        data-testid="index-token"
        className="focus:outline-none field-sizing-content"
        data-empty={empty || undefined}
        placeholder="0"
        type="text"
        pattern="[0-9]*"
        value={token.value || ""}
        onChange={(e) =>
          updateToken(bindingId, tokenIndex, { value: e.target.value })
        }
      />
      <span>]</span>
    </label>
  );
});

export default IndexToken;
