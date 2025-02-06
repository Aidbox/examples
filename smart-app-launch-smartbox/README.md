# Example: SMART App Launch using Smartbox and Keycloak

This example showcases the Smart App EHR and Patient [launch flows](https://hl7.org/fhir/smart-app-launch/app-launch.html).

## Components

1. Smartbox FHIR server with SMART-on-FHIR support.
2. [Keycloak](https://www.keycloak.org/)\
   Identity and Access Management solution that integrates with Aidbox through the [IdentityProvider](https://docs.aidbox.app/modules/security-and-access-control/set-up-external-identity-provider) resource.
3. [Growth Chart Smart App](https://github.com/smart-on-fhir/growth-chart-app)\
   A SMART pediatric web application that displays patient growth charts based on their observations.
4. **Demo Launcher Page**\
   A web page that emulates EHR patient context selection.

## Prerequisites

* [Docker](https://www.docker.com/)
* Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
* Working directory: `smart-app-launch-smartbox`

To clone the repository and navigate to the `smart-app-launch-smartbox` directory, run:

```sh
git clone git@github.com:Aidbox/examples.git && cd examples/smart-app-launch-smartbox
```

Edit a `docker-compose.yaml` file and paste there your license keys.

```yaml
# docker-compose.yaml
...
services:
  portal:
    environment:
      AIDBOX_LICENSE: <YOUR_PORTAL_LICENSE>
...
  sandbox:
    environment:
      AIDBOX_LICENSE: <YOUR_SANDBOX_LICENSE>
```

## Step 1: Run Demo Components

Start all the demo components by running:

```sh
docker compose up
```

Wait until all components are pulled and started. The components are accessible at:

* Aidbox - [http://localhost:8888](http://localhost:8888)
* Keycloak - [http://localhost:7777](http://localhost:7777)
* Growth Chart - [http://localhost:9000](http://localhost:9000)
* Demo Launcher Page - [http://localhost:7070/launcher.html](http://localhost:7070/launcher.html)

## Step 2: Open launcher Page

Open the [Demo Launcher Page](http://localhost:7070/launcher.html).

* **Left Side:** A list of patients retrieved from Aidbox, simulating EHR patient context selection.
* **Right Side:** A Patient Standalone Launch with a pre-selected patient context, simulating a launch directly from the SMART App.

## Step 3: Perform EHR Launch

**3.1** Select a patient from the list on the left side and click the `Launch Growth Chart App` button to start the launch process.\
**3.2** On the Aidbox login screen, click the `Sign in with Keycloak` button.\
**3.3** Log in to Keycloak with username `patient` and password `password`\
**3.4** On the consent screen, allow all requested scopes.\
**3.5** View the patient's data in the Growth Chart app.

## Step 4: Perform Patient Standalone Launch

**4.1** Go back to the [Demo Launcher](http://localhost:7070/launcher.html)\
**4.2** On the right side of the screen, click the **Launch Growth Chart App** button under Patient Standalone Launch.\
**4.2** On the consent screen, allow all requested scopes.\
**4.3** View the patient's data in the Growth Chart app.

## EHR Launch Interaction Diagram

```mermaid
sequenceDiagram
    actor Customer as User
    participant EHR as EHR <br> (Demo Launcher)
    participant Aidbox as Aidbox 
    participant Keycloak as Keycloak 
    participant Smart App as Growth Chart <br> (SMART App)
    Note right of EHR: Communicates with Aidbox <br> using HTTP basic auth
    Customer ->> EHR: Launch Smart App
    activate EHR
    EHR ->> Smart App: Launch context
    deactivate EHR
    activate Smart App
    Smart App ->> Aidbox: Redirect to /auth/login?response_type=code&client_id....
    deactivate Smart App
    activate Aidbox
    Aidbox ->> Keycloak: Redirect to Keycloak Login page 
    deactivate Aidbox
    activate Keycloak 
    Note right of Keycloak: Login with Keycloak credentials
    Keycloak ->> Aidbox: Response with code
    deactivate Keycloak
    activate Aidbox
    Aidbox ->> Keycloak: Request to exchange code to token
    deactivate Aidbox 
    activate Keycloak 
    Keycloak ->> Aidbox: Return token 
    deactivate Keycloak
    activate Aidbox
    Aidbox ->> Keycloak: Request user info
    deactivate Aidbox 
    activate Keycloak
    Keycloak ->> Aidbox: Return user info 
    deactivate Keycloak
    activate Aidbox
    Aidbox ->> Aidbox: Create User resource in Aidbox  
    Aidbox ->> Customer: Show the Grant screen 
    deactivate Aidbox 
    activate Customer
    Customer ->> Aidbox: Allow requested scopes  
    deactivate Customer
    activate Aidbox
    Aidbox ->> Aidbox: Check granted permissions
    Aidbox ->> Smart App: Redirect with code
    deactivate Aidbox 
    activate Smart App
    Smart App ->> Aidbox: Request /auth/token <br> to exchange code to token
    deactivate Smart App
    activate Aidbox
    Aidbox ->> Smart App: Return token
    deactivate Aidbox 
    activate Smart App
    Smart App ->> Aidbox: Request /Observation and /Patient/<pt-id> with token
    deactivate Smart App
    activate Aidbox
    Aidbox ->> Aidbox: Validate scopes from token
    Aidbox ->> Smart App: Return Observations and Patient
    deactivate Aidbox 
    activate Smart App
    Smart App ->> Customer: Show patient's data
    deactivate Smart App
```