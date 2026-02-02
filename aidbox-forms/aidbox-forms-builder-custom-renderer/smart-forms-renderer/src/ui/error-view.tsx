import React from "react";

type ErrorViewProps = {
  message: string;
};

export const ErrorView = ({ message }: ErrorViewProps) => (
  <div
    style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "8px",
      color: "#b42318",
    }}
  >
    {message}
  </div>
);
