This is a Aidbox Forms Smart Launch project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

You can use this project as a starting point for building your own Aidbox Forms Smart App. 
It is intentionally kept simple to help you understand how to integrate Aidbox Forms adapt it to your needs.

It includes an implementation of:
- [x] SMART on FHIR Launch sequence on the backend
  - [x] Cookie based session management
- [x] Configuration of Aidbox server
  - [x] Multitenancy via Organization based Access Control
- [x] Client authentication with Aidbox
- [x] FHIR resources synchronization using `$everything`
- [ ] FHIR resources synchronization using predefined resource URLs
- [x] Integration of Aidbox Forms via web components
- [x] Questionnaire CRUD operations
  - [x] Searching questionnaires
  - [x] Viewing questionnaires
  - [x] Creating questionnaire responses
  - [x] Viewing public library
  - [x] Importing questionnaires from public library
  - [x] Editing questionnaires
  - [x] Deleting questionnaires
- [x] Questionnaire response CRUD operations
  - [x] Creating questionnaire responses
    - [x] Pre-populating questionnaire responses
  - [x] Viewing questionnaire responses
  - [x] Editing questionnaire responses
  - [x] Deleting questionnaire responses

[Demo](https://forms-smart-app.aidbox.app)

## Development

First, copy `.env.example` to `.env` and set the correct values:

```bash
cp .env.example .env
```

Then, start aidbox server:

```bash
docker-compose up -d
```

Install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Aidbox server will be available at [http://localhost:8888](http://localhost:8888).

## Interaction Diagram

```mermaid
sequenceDiagram
    actor Customer as User
    participant EHR as EHR <br> (with auth server)
    participant Smart App as Smart App <br> (with backend)
    participant Aidbox as Aidbox <br> (not publicly accessible)
    Note right of Smart App: Communicates with Aidbox <br> using HTTP basic auth
    Customer ->> EHR: Launch Smart App
    EHR ->> Smart App: Launch context + Access Token
    Smart App ->> Aidbox: Upsert organization
    activate Smart App
    Note right of Smart App: Unique organization per EHR
    Note right of Aidbox: From this point forward, 🔒 indicates that <br> requests are made exclusively within <br>the scope of the corresponding EHR Organization
    Smart App ->> Aidbox: Upsert resources from launch context 🔒

    alt Sync using $everything
        Smart App ->>+ EHR: Request /Patient/:id/$everything
        EHR ->>- Smart App: Return a bundle
        Smart App ->> Aidbox: Upsert resource from the bundle 🔒
    else Sync using predefined resource URLs
        loop For each resource URL
            Smart App ->>+ EHR: Send Get request to the URL
            Note left of Smart App: Optionally substitute current patient id
            EHR ->>- Smart App: Return a bundle (or single resource)
            Smart App ->> Aidbox: Upsert resource from the bundle 🔒
        end
    end
    deactivate Smart App
    Smart App ->> Customer: Redirect to dashboard
    opt Viewing questionnaires
        Customer ->>+ Smart App: Show questionnaires
        Smart App ->>+ Aidbox: Request /Questionnaire 🔒
        Aidbox ->>- Smart App: Return questionnaires
        Smart App ->>- Customer: Display questionnaires
        Customer ->>+ Smart App: Edit questionnaire
        Smart App ->>- Customer: Display Form Builder
    end
%% opt Viewing public library
%%     Customer ->>+ Smart App: Show public library
%%     Smart App ->>+ Public Library: Request /Questionnaire
%%     Public Library ->>- Smart App: Return questionnaires
%%     Smart App ->>- Customer: Display questionnaires of public library
%% end
%% opt Importing questionnaires
%%     Customer ->>+ Smart App: Import questionnaire
%%     Smart App ->>+ Public Library: Request /Questionnaire/:id
%%     Public Library ->>- Smart App: Return a questionnaire
%%     Smart App ->> Aidbox: Insert the questionnaire 🔒
%%     Smart App ->>- Customer: Display questionnaires
%% end
    opt Creating questionnaire responses
        Customer ->>+ Smart App: Create response response <br> from the selected questionnaire
        Smart App ->>+ Aidbox: Request Questionnaire/$populate 🔒
        Aidbox ->> Aidbox: Execute fhir queries <br> from population expression 🔒
        Note right of Aidbox: Guaranteed by Aidbox to run correctly, as <br> it has proper implementations of search parameters
        Aidbox ->>- Smart App: Return a questionnaire response
        Smart App ->> Aidbox: Save the questionnaire response 🔒
        Smart App ->>- Customer: Display Form Renderer with <br> the created questionnaire response
        Customer ->> Smart App: Fill
        Customer ->>+ Smart App: Submit
        Smart App ->> Aidbox: Request /Questionnaire/$process-response 🔒
        activate Aidbox
        Aidbox ->> Aidbox: Validate the questionnaire response 🔒
        alt validation ok
            Aidbox ->> Aidbox: Save the questionnaire response 🔒
            Aidbox ->> Smart App: Return the questionnaire response
            Smart App ->> Customer: Display update questionnaire response
        else validation error
            Aidbox ->> Smart App: Return errors
            Smart App ->> Customer: Display Errors
        end
        deactivate Aidbox
        deactivate Smart App
    end
```
