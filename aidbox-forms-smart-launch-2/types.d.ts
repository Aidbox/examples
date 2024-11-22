/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

// declare module "react" {
//   interface CSSProperties {
//     "--sidebar-width"?: string;
//   }
// }

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "aidbox-form-renderer": React.DetailedHTMLProps<
        React.IframeHTMLAttributes<HTMLIFrameElement>,
        HTMLIFrameElement
      > & {
        questionnaire?: string;
      };
    }
  }
}
