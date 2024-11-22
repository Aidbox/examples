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
        "questionnaire-response"?: string;
      };
      "aidbox-form-builder": React.DetailedHTMLProps<
        React.IframeHTMLAttributes<HTMLIFrameElement>,
        HTMLIFrameElement
      > & {
        "hide-back"?: boolean;
        "show-share"?: boolean;
        "hide-population"?: boolean;
        "hide-extraction"?: boolean;
        "hide-publish"?: boolean;
        "hide-add-theme"?: boolean;
        "hide-edit-theme"?: boolean;
        "hide-save-theme"?: boolean;
        "hide-convert"?: boolean;
        "hide-save"?: boolean;
        "disable-save"?: boolean;
        value?: string;
      };
    }
  }
}
