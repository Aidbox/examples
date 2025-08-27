---
features: [fhir sdc, structured data capture, questionnaire, api, forms]
languages: [yaml]
---
# FHIR SDC API in Aidbox

This demo shows how to use [FHIR SDC Api](https://hl7.org/fhir/uv/sdc/) in Aidbox via Aidbox Forms module.

## Prerequisites

1. Docker
2. Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
3. Working directory: `fhir-sdc-api`

`git clone git@github.com:Aidbox/examples.git && cd examples/fhir-sdc-api`


## 1. Run Aidbox

`docker compose up`

Docker Compose file initializes aidbox with following configuration:

* Imports sample Questionnaire
* Creates two patients

## 2. Use `$populatelink` API

To fill the form, you can use Aidbox Forms UI or use FHIR SDC API from Aidbox Rest Console

### 2.1 Create form link from Aidbox Forms UI

1. Open Aidbox Forms UI: [`localhost:8080/ui/sdc`](http://localhost:8080/ui/sdc)
2. Click share on the **_CVD Reference Form_** (this is the form that was imported)
3. Choose a patient
4. Click Attach button to get the link

Now you can open the link you obtained on the last step and start filling the form.

### 2.2 Create form using FHIR SDC API

Now, we’ll do the same but using [`$populatelink`](https://docs.aidbox.app/reference/aidbox-forms/fhir-sdc-api#populate-questionnaire-and-generate-a-link-usdpopulatelink) call using Aidbox REST Console

1. Open Aidbox Rest Console [`localhost:8080/ui/console#/rest`](http://localhost:8080/ui/console#/rest)
2. Send this request:

```
POST /Questionnaire/cvd-reference-form/$populatelink

resourceType: Parameters
parameter:
  - name: subject
    valueReference:
      reference: Patient/john
  - name: local
    valueBoolean: true
```

## 3. Extract and save resources from QuestionnaireResponse

FHIR SDC defines an operation `$extract` to retrieve resources from `QuestionnaireResponse`. However, since it’s a stateless operation, it returns a `Bundle` that you need to save by yourself.

### 3.1 Using Aidbox Forms UI

The Aidbox Forms UI has auto-save feature. That means it will save `QuestionnaireResponse` each time you
changed answers in the form.

But after clicking **`Submit`** button it will extract resources from this QuestionnaireResponse and save it into database. So you don’t need to save extracted resources manually.

### 3.2 Using FHIR SDC API

You need to fill the QuestionnaireResponse and obtain it ID.

1. Open Aidbox Rest Console [`localhost:8080/ui/console#/rest`](http://localhost:8080/ui/console#/rest)
2. Extract resources

```
POST /QuestionnaireResponse/<your-qr-id>/$extract
````

In response you will get something like this:
```
resourceType: Parameters
parameter:
  - name: return
    resource:
      resourceType: Bundle
      entry:
       — resource:
           resourceType: Observation
      <<< list of resources >>>
```

3. Save extracted resources

Now we need to save this `Bundle` that we get in `return` parameter using `POST /`

```yaml
POST /

resourceType: Bundle
entry:
  - resource:
      resourceType: Observation
  <<< list of extracted resources >>>
```

## View extracted resources

```
GET /Observation
```

Since our form extracts only observation you should see two or three new Observations depending on your answers.
