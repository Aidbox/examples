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

Make sure that you set `AIDBOX_LICENSE` key inside `.env`

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up
```
