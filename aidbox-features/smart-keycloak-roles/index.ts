import { Hono } from "hono";

const app = new Hono();

function decodeJWT(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return { error: "Invalid JWT format: expected 3 parts" };

  try {
    // JWT uses base64url encoding, need to convert to standard base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (err) {
    return { error: `Failed to decode JWT: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

const config = {
  keycloakUrl: process.env.KEYCLOAK_URL || "http://localhost:8888",
  keycloakPublicUrl: process.env.KEYCLOAK_PUBLIC_URL || process.env.KEYCLOAK_URL || "http://localhost:8888",
  keycloakRealm: process.env.KEYCLOAK_REALM || "master",
  clientId: process.env.KEYCLOAK_CLIENT_ID || "account",
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  aidboxUrl: process.env.AIDBOX_FHIR_BASE || "http://localhost:8080/fhir",
};

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getKeycloakAuthUrl(sessionId: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.appUrl}/callback`,
    response_type: "code",
    scope: "openid profile email",
    state: sessionId,
  });

  return `${config.keycloakPublicUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/auth?${params}`;
}

async function exchangeCodeForToken(code: string) {
  const tokenUrl = `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: `${config.appUrl}/callback`,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

async function fetchObservations(accessToken: string) {
  const response = await fetch(`${config.aidboxUrl}/Observation`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/fhir+json",
    },
  });

  if (!response.ok) {
    throw new Error(`FHIR API call failed: ${response.statusText}`);
  }

  return await response.json();
}

function getKeycloakLogoutUrl(redirectUri?: string) {
  const params = new URLSearchParams();
  if (redirectUri) {
    params.set("post_logout_redirect_uri", redirectUri);
  }
  params.set("client_id", config.clientId);

  return `${config.keycloakPublicUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/logout?${params}`;
}

app.get("/", (c) => {
  const sessionId = generateSessionId();
  c.header("Set-Cookie", `sessionId=${sessionId}; Path=/; HttpOnly`);

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Keycloak + Aidbox Integration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .token-display { background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        .btn { padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block; }
        .error { color: red; }
        .success { color: green; }
        .observations { background: #f8f9fa; padding: 15px; border-radius: 5px; max-height: 400px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Keycloak + Aidbox FHIR Integration</h1>

        <div class="section">
            <h2>Authentication</h2>
            <p>Click below to authenticate with Keycloak:</p>
            <a href="${getKeycloakAuthUrl(sessionId)}" class="btn">Login with Keycloak</a>
        </div>

        <div class="section">
            <h2>Token Information</h2>
            <div id="token-info">
                <p>No token available. Please login first.</p>
            </div>
        </div>

        <div class="section">
            <h2>FHIR Observations</h2>
            <div id="observations-info">
                <p>Login and get a token to fetch observations.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

  return c.html(html);
});

app.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.html(`<h1>Authentication Error</h1><p>${error}</p>`);
  }

  if (!code || !state) {
    return c.html("<h1>Missing authorization code or state</h1>");
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const decodedToken = decodeJWT(tokenResponse.access_token);

    let observationsData = null;
    let observationsError = null;

    try {
      observationsData = await fetchObservations(tokenResponse.access_token);
    } catch (err) {
      observationsError = err instanceof Error ? err.message : "Unknown error";
    }

    const observationsList = observationsError
      ? []
      : observationsData?.entry || [];

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Success</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .token-display { background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; font-size: 12px; }
        .success { color: green; }
        .error { color: red; }
        .api-call { background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .api-url { font-family: monospace; font-weight: bold; color: #1976d2; }
        .json-response { background: #f8f9fa; padding: 15px; border-radius: 5px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; }
        .observation-card { background: white; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin: 10px 0; }
        .observation-card h4 { margin: 0 0 10px 0; color: #1976d2; }
        .observation-detail { margin: 5px 0; }
        .observation-detail strong { color: #555; }
        .btn { padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="success">Authentication Successful!</h1>

        <div class="section">
            <h2>Decoded Access Token</h2>
            <div class="token-display">${JSON.stringify(decodedToken, null, 2)}</div>
        </div>

        <div class="section">
            <h2>API Call</h2>
            <div class="api-call">
                <div><strong>GET</strong> <span class="api-url">${config.aidboxUrl}/Observation</span></div>
                <div style="margin-top: 5px; font-size: 12px; color: #666;">Authorization: Bearer [token]</div>
            </div>

            <h3>JSON Response</h3>
            ${
              observationsError
                ? `<div class="error">Error fetching observations: ${observationsError}</div>`
                : `<div class="json-response">${JSON.stringify(observationsData, null, 2)}</div>`
            }
        </div>

        <div class="section">
            <h2>Observations Visualization</h2>
            ${
              observationsError
                ? `<div class="error">No observations available due to error</div>`
                : observationsList.length === 0
                  ? `<div>No observations found</div>`
                  : observationsList
                      .map((entry: any) => {
                        const obs = entry.resource;
                        const code =
                          obs.code?.coding?.[0]?.display ||
                          obs.code?.text ||
                          "Unknown";
                        const category =
                          obs.category?.[0]?.coding?.[0]?.display ||
                          "Observation";
                        const date =
                          obs.effectiveDateTime || obs.issued || "N/A";
                        const status = obs.status || "unknown";
                        const subject =
                          obs.subject?.display ||
                          obs.subject?.reference ||
                          "N/A";

                        const hasComponents =
                          obs.component && obs.component.length > 0;

                        let valueDisplay = "";
                        if (hasComponents) {
                          valueDisplay = obs.component
                            .map((comp: any) => {
                              const compName =
                                comp.code?.text ||
                                comp.code?.coding?.[0]?.display ||
                                "Component";
                              const compValue = comp.valueQuantity
                                ? `${comp.valueQuantity.value} ${comp.valueQuantity.unit || ""}`
                                : comp.valueString ||
                                  comp.valueCodeableConcept?.text ||
                                  "N/A";
                              return `<div style="margin: 5px 0; padding-left: 10px;">• <strong>${compName}:</strong> ${compValue}</div>`;
                            })
                            .join("");
                        } else {
                          valueDisplay = obs.valueQuantity
                            ? `<div>${obs.valueQuantity.value} ${obs.valueQuantity.unit || ""}</div>`
                            : obs.valueString ||
                              obs.valueCodeableConcept?.text ||
                              "N/A";
                        }

                        return `
                    <div class="observation-card">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0;">${code}</h4>
                        <span style="background: #e3f2fd; padding: 4px 12px; border-radius: 12px; font-size: 11px; color: #1976d2;">${category}</span>
                      </div>
                      <div class="observation-detail">
                        <strong>${hasComponents ? "Components:" : "Value:"}</strong>
                        ${valueDisplay}
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                        <div class="observation-detail"><strong>Patient:</strong> ${subject}</div>
                        <div class="observation-detail"><strong>Status:</strong> ${status}</div>
                        <div class="observation-detail" style="grid-column: 1 / -1;"><strong>Date:</strong> ${date}</div>
                      </div>
                    </div>
                  `;
                      })
                      .join("")
            }
        </div>

        <div class="section">
            <a href="/logout" class="btn">Start Over</a>
        </div>
    </div>
</body>
</html>`;

    return c.html(html);
  } catch (err) {
    console.error("Token exchange error:", err);
    return c.html(
      `<h1>Token Exchange Error</h1><p>${err instanceof Error ? err.message : "Unknown error"}</p>`,
    );
  }
});

app.get("/logout", (c) => {
  c.header("Set-Cookie", "sessionId=; Path=/; HttpOnly; Max-Age=0");
  const logoutUrl = getKeycloakLogoutUrl(`${config.appUrl}/logout-callback`);
  return c.redirect(logoutUrl);
});

app.get("/logout-callback", (c) => {
  return c.redirect("/");
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = parseInt(process.env.APP_PORT || "3000");

console.log(`Starting server on port ${port}...`);
console.log(`Keycloak URL: ${config.keycloakUrl}`);
console.log(`Aidbox FHIR URL: ${config.aidboxUrl}`);
console.log(`Client ID: ${config.clientId}`);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
