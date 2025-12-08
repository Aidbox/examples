# hl7-converter

This is a demo project for creation of HL7 BAR messages from Aidbox resources.
It listens to Aidbox `Invoice` creation and formats BAR-s from the related data.

## Getting Started

To install dependencies:

```bash
npm install
```

The project is runnable from Docker Compose file:

```bash
docker compose up
```

In case you need to extend/develop the project, you can start it with NPM.
Notice that Aidbox instance is still necessary for it.
So either deploy your own Aidbox or use the one provided in docker-compose.yml:

```bash
# To run aidbox and its dependencies
docker compose up -d aidbox
# To launch the project server and make it hot-reload on change
npm run dev
```

### Setup: Enviroment Variables

Environment variables for running the project are:

<dl>
<dt> PORT (optional)
<dd> Port to run the server on. Defaults to 3000
<dt> AIDBOX_BASE_URL (required)
<dd>
    Host+port for the location Aidbox is deployed on.
    For local development, <code>http://127.0.0.1:8789</code> is recommented, unless you changed the port in docker-compose.yml or environment (<code>AIDBOX_PORT</code>, see below)
<dt> AIDBOX_CREDENTIALS (required)
<dd>
    Credentials for Aidbox app.
    Base64-encoded <code>id:secret</code> string.
    <code>id</code> should be <code>hl7-app</code> or the client name you set up when creating the App (via <a href=resources/aidbox-app.yaml>resources/aidbox-app.yaml</a>, for example)
    <code>secret</code> should be the secure password/secret provided on App creation

<dt> AIDBOX_LICENSE (required)
<dd> Aidbox license you got from <a href=https://aidbox.app/ui/portal>Aidbox portal</a>

<dt> AIDBOX_PORT (required)
<dd> The port to start Aidbox on

<dt> AIDBOX_ADMIN_PASSWORD (required)
<dd> Password for Aidbox <code>admin</code> user

<dt> AIDBOX_CLIENT_ID (required)
<dd> Root client ID

<dt> AIDBOX_CLIENT_SECRET (required)
<dd> A secret for Root client

<dt> MLLP_RECEIVER_HOST (required)
<dd> The host to sent MLLP request with final message to. Without the `http://` part. E.g. `127.0.0.1` for local development.

<dt> MLLP_RECEIVER_PORT (optional)
<dd> MLLP_RECEIVER_HOST port for MLLP messages. Defaults to 2575.
</dl>

### Setup: App and SearchParameters

[resources folder](./resources/) contains resources necessary for the server to connect to Aidbox and interact with it:

<dl>
<dt> <a href=resources/aidbox-app.yaml>aidbox-app.yaml</a>
<dd>
    Definition of Aidbox <code>App</code> and its <code>AccessPolicies</code> so that this server can make requests to Aidbox
    Should be edited with relevant <code>PUT_APP_ENDPOINT_URL_HERE</code> (full location of this server deployment)
    and <code>PUT_SECRET_HERE</code> as the secret for <code>Client</code> authorization.
    <code>PUT_SECRET_HERE</code> should match the secret encoded in <code>AIDBOX_CREDENTIALS</code> environment variable.
    Should be posted to Aidbox as
<pre lang=rest>
POST /fhir/App

contents of the file...
</pre>

<dt> <a href=resources/topic.http>topic.http</a>
<dd>
    <code>AidboxSubscriptionTopic</code> to track <code>Invoice</code> resources created in Aidbox.
    Can be posted directly to Aidbox in REST Console.

<dt> <a href=resources/topic-destination.http>topic-destination.http</a>
<dd>
    <code>AidboxTopicdestination</code> to send created <code>Invoice</code>-s as a WebHook to this server
    Requires <code>parameter</code> > <code>endpoint</code> > <code>valueUrl</code> to refer to the full location this server is deployed in.
    Can be posted directly to Aidbox in REST Console after substituting the endpoint location.

<dt> <a href=resources/invoice-charge-item.http>invoice-charge-item.http</a>
<dd>
    <code>SearchParameter</code> to get <code>Invoice</code>'s <code>ChargeItem</code>-s.
    Can be posted directly to Aidbox in REST Console.

<dt> <a href=resources/account-coverage.http>account-coverage.http</a>
<dd>
    <code>SearchParameter</code> to get <code>Account</code>'s <code>Coverage</code>-s.
    Can be posted directly to Aidbox in REST Console.
</dl>

## Usage

Open the `http://LOCATION/api-docs` to get access to Swagger docs for the server.
These list all the available endpoints and their parameters.