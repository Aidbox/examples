import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "aidbox-form-renderer": React.DetailedHTMLProps<
        React.IframeHTMLAttributes<HTMLIFrameElement>,
        HTMLIFrameElement
      > & {
        questionnaire?: string;
        "questionnaire-response"?: string;
        config?: string;
        "hide-footer"?: boolean;
      };
      "aidbox-form-builder": React.DetailedHTMLProps<
        React.IframeHTMLAttributes<HTMLIFrameElement>,
        HTMLIFrameElement
      > & {
        "enable-fetch-proxy"?: boolean;
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
        "form-id"?: string;
        value?: string;
      };
    }
  }
}
