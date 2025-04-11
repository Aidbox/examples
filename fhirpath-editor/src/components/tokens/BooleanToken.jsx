import React from "react";
import { useProgramContext } from "@utils/store.jsx";

const BooleanToken = React.forwardRef(({ bindingId, tokenIndex }, ref) => {
  const { token, updateToken } = useProgramContext((state) => ({
    token: state.getToken(bindingId, tokenIndex),
    updateToken: state.updateToken,
  }));
  return (
    <select
      ref={ref}
      data-testid="boolean-token"
      className="focus:bg-gray-100 focus:outline-none hover:outline hover:outline-gray-300 px-1 py-0.5 rounded field-sizing-content text-green-800 appearance-none"
      value={token.value}
      onChange={(e) =>
        updateToken(bindingId, tokenIndex, { value: e.target.value })
      }
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  );
});

export default BooleanToken;
