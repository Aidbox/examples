import path from "node:path";
import dotenv from "dotenv";
import { object, safeParse, string, transform, url, ValiError } from "valibot";

import { Config } from "./types";

export const isDev = process.env.NODE_ENV === "development";

const envSchema = object({
  AIDBOX_BASE_URL: string([url()]),
  AIDBOX_CLIENT_ID: string(),
  AIDBOX_CLIENT_SECRET: string(),
  APP_PORT: transform(string(), (data) => {
    const port = parseInt(data);
    if (isNaN(port)) {
      console.error("APP_PORT cannot be parsed as a number. Input value -", data);
      process.exit(1);
    }
    return port;
  }),
  APP_URL: string([url()]),
  APP_CALLBACK_URL: string(),
  APP_SECRET: string(),
});

const prettifyError = (issues: ValiError["issues"]) => {
  let result: string = "";

  for (const issue of issues) {
    result += `Key '${issue.path?.[0].key}' expected to be '${issue.reason}', got '${issue.path?.[0].value}'\n`;
  }
  console.log(result);
};

export const getConfig = (): Config => {
  dotenv.config({ path: isDev ? path.resolve("..", ".env") : undefined });

  const parsed = safeParse(envSchema, process.env);

  if (parsed.success) {
    const result = parsed.output;
    return {
      app: {
        port: result.APP_PORT,
        baseUrl: result.APP_URL,
        callbackUrl: result.APP_CALLBACK_URL,
        secret: result.APP_SECRET,
      },
      aidbox: {
        url: result.AIDBOX_BASE_URL,
        client: {
          id: result.AIDBOX_CLIENT_ID,
          secret: result.AIDBOX_CLIENT_SECRET,
        },
      },
    };
  }
  prettifyError(parsed.issues);
  process.exit(1);
};
