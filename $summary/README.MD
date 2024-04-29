# IPS Summary Operation

[Specification](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html)

## Prerequisites

- [Node 18+](https://nodejs.org/en/)
- [Docker](https://www.docker.com/)

## STEP 1: Environment and Aidbox license
```shell
cp .env.tpl .env
```
As a result you have the `.env` file that contains default settings.

Get Aidbox license on https://aidbox.app user portal

Make sure that you set `AIDBOX_LICENSE` key inside `.env`

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up
```

## Step 3: Open and log in into Aidbox instance

Opein in browser http://localhost:8888 

And loging witn login: `admin` and password: `password`


## Step 4: Load test dataset

Open rest console and run request

```
POST /fhir/$load
Content-Type: text/yaml

source: 'https://storage.googleapis.com/aidbox-public/synthea/100/all.ndjson.gz'
```


## Step 5: Request $summarty 

Now you can request `GET /fhir/Patient/[di]/$summarry`

[Specification](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html)

```
GET /fhir/Patient/08b9a2bf-7492-4d15-b97f-00b54a3b35ee/$summary
```
