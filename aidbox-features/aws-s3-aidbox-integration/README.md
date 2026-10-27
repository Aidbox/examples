---
features: [S3, Storage, Attachments, Next.js, Presigned URLs, Data Offload, Binary, RustFS]
languages: [TypeScript]
---
# AWS S3 Aidbox integration example
![image](https://github.com/user-attachments/assets/fb3026ef-be1f-4ef8-845e-064e463adb0f)
This example shows two ways to keep files in [S3-compatible storage](https://docs.aidbox.app/storage-1/s3-compatible-storages/aws-s3) with Aidbox, using a local [RustFS](https://github.com/rustfs/rustfs) and a front-end application exclusively. The app saves and retrieves a patient's photo, and you pick the approach on the Patient form:

| | Presigned URLs | Binary data offload |
|---|---|---|
| Upload | The browser asks Aidbox for a signed URL and uploads straight to the bucket | The browser posts the raw file to `/fhir/Binary`, Aidbox streams it to the bucket |
| `Patient.photo.url` | Object URL in the bucket | `Binary/<id>` |
| Read | Ask Aidbox for a signed GET URL, then fetch it from the bucket | `GET /fhir/Binary/<id>` with `Accept: image/png` |
| The client sees the bucket | Yes | No, it only talks FHIR |
| Bytes pass through Aidbox | No | Yes (streamed, capped by `web.max-body`, 20 MB by default) |

In both cases Aidbox holds the bucket credentials in an `AwsAccount` resource.

## Setting Up Aidbox
1. Clone the repository 
```bash
git clone git@github.com:Aidbox/examples.git 
```
2. Change the directory to the current example.
3. Start Aidbox, AidboxDB, RustFS, and the front-end. A one-off `createbucket` container creates the `mybucket` and `offload` buckets, plus a CORS rule on `mybucket` for the front-end. The front-end image is built on the first run.
```bash
docker compose up --build
```
4. Go to http://localhost:8888 and activate Aidbox using the Aidbox Portal (see the [Getting Started Guide](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker/run-aidbox-locally#id-4.-activate-your-aidbox-instance)).
5. Optionally, open the RustFS console at http://localhost:9001/rustfs/console/index.html (username `rustfsadmin`, password `rustfsadmin`) to browse the buckets.

On start Aidbox applies [`init-bundle.json`](init-bundle.json), which creates:
- `AwsAccount/my-account`: RustFS as the browser sees it (`127.0.0.1:9000`), used to sign URLs.
- `AwsAccount/offload-account`: RustFS as Aidbox sees it inside Docker (`rustfs:9000`), used to offload `Binary.data`.
- `Client/basic` with secret `secret`, and an `AccessPolicy` that allows it everything. The front-end sends `Authorization: Basic YmFzaWM6c2VjcmV0` (see `src/constants.ts`).
- A `Binary` storage and API with data offload turned on (see [Binary data offload](#approach-2-binary-data-offload) below).

## Running the application
Go to http://localhost:3000. The `app` service serves a production build of the Next.js front-end.

To work on the front-end with hot reload, stop the container and run the dev server instead:
```bash
docker compose stop app
npm install
npm run dev
```

To save Patient and DocumentReference resources and the photo in the bucket:
- Choose the storage approach: **Presigned URL** or **Binary data offload**,
- Fill the patient form,
- Attach the patient photo,
- Press submit button.

To get Patient photo by the id, type the id and press Get Photo button. The form works out the approach from `Patient.photo.url`.

# What's going on under the hood?
## Approach 1: Presigned URLs
### Saving a File to the Bucket: Workflow
1. Send a POST request from the front-end to Aidbox with the desired filename:
```http
POST /aws/storage/<your-account-id-in-aidbox>/<your-bucket-name>

filename: patient.png
```
2. Receive a [pre-signed URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) from Aidbox.

AWS:
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/patient.png?..."
}
```

RustFS:
```json
{
  "url": "http://127.0.0.1:9000/mybucket/John_Smith_20250226.png?..."
}
```
3. Upload the file directly to S3 by sending a POST request to the pre-signed URL. The file content (e.g., the patient's photo) is sent in the request body and saved in the bucket.

### Retrieving a File from the Bucket: Workflow
1. Send a GET request from the front-end to Aidbox with the filename:
```http
GET /aws/storage/<your-account-id-in-aidbox>/<your-bucket-name>/<filename>
```
2. Receive a [presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) from Aidbox.
 
AWS:
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/patient.png?..."
}
```

RustFS:
```json
{
  "url": "http://127.0.0.1:9000/mybucket/John_Smith_20250226.png?..."
}
```
3. Use GET request to the URL to retrieve the file.
For images, an <img> HTML tag can be used to render the image directly:
```react
<img
  src="<signed-url>"
/>
```

## Approach 2: Binary data offload
[Data offload](https://www.health-samurai.io/docs/aidbox/configuration/storage-and-api-configuration/offload-base64binary-to-external-storage) (Aidbox 2607+, streaming 2608+) moves `base64Binary` values out of PostgreSQL into a bucket. The client uses the plain FHIR API and never sees the storage.

It is configured per API. The init bundle creates a `Binary` storage and an API with `dataOffloadToExternalStorage`:
```json
{
  "request": { "method": "POST", "url": "/$create-api" },
  "resource": {
    "resourceType": "Parameters",
    "parameter": [
      { "name": "apiId", "valueString": "binary-api" },
      { "name": "ifNoneExist", "valueBoolean": true },
      { "name": "resourceType", "valueString": "Binary" },
      { "name": "storageId", "valueString": "binary-offload" },
      { "name": "apiTemplate", "valueString": "pre-2604" },
      {
        "name": "dataOffloadToExternalStorage",
        "part": [
          { "name": "fhirpathToBase64BinaryElement", "valueString": "data" },
          { "name": "storageProvider", "valueCode": "aws" },
          { "name": "awsAccount", "valueReference": { "reference": "AwsAccount/offload-account" } },
          { "name": "awsBucket", "valueString": "offload" },
          { "name": "blobNamePrefix", "valueString": "binary" }
        ]
      }
    ]
  }
}
```

### Saving a File: Workflow
1. Post the raw file to Aidbox:
```http
POST /fhir/Binary
Content-Type: image/png

<file bytes>
```
2. Aidbox streams the bytes to `s3://offload/binary/<uuid>` and stores only a pointer. The response has no `data`:
```json
{
  "resourceType": "Binary",
  "id": "01a17d82-54a9-715d-8d80-1e88e72615ad",
  "contentType": "image/png",
  "_data": {
    "extension": [
      {
        "url": "http://health-samurai.io/fhir/core/data-offloaded-to-external-storage",
        "extension": [{ "url": "hash", "valueString": "XCd0zAwAEdtT4R7voyVFKRVnRnc=" }]
      }
    ]
  }
}
```
3. Reference the Binary from the Patient and DocumentReference: `"url": "Binary/01a17d82-54a9-715d-8d80-1e88e72615ad"`.

### Retrieving a File: Workflow
Read the Binary with an `Accept` header that matches its `contentType`. Aidbox streams the bytes back from the bucket:
```http
GET /fhir/Binary/01a17d82-54a9-715d-8d80-1e88e72615ad
Accept: image/png
```
The request needs the `Authorization` header, so the front-end fetches it, turns the response into a blob, and renders it with `URL.createObjectURL`. With `Accept: application/fhir+json` the same read returns the Binary with `data` restored as base64.

### Things to know
- Search and history return the stored form, with the pointer and without `data`. Only reads restore it.
- Deleting or updating a Binary leaves the old object in the bucket.
- Reads use the current API configuration. Pointing the API at another bucket makes data offloaded earlier unreadable.

## Which one to choose
- **Presigned URLs** keep large files off the Aidbox instance, and the bucket can serve them straight to the browser. The client has to know about storage, and you manage object names yourself.
- **Data offload** keeps everything behind the FHIR API and its access policies: the client never gets a bucket URL, and the database stays small. All bytes pass through Aidbox, and uploads are capped by `web.max-body`.

## FHIR & binary files
In this example, the [Attachment](https://build.fhir.org/datatypes.html#attachment) FHIR datatype is used to store the file's URL. Specifically, the Patient.photo field contains an attachment representing the saved photo. With presigned URLs `url` points to the object in the bucket, as in the examples below. With data offload it is `Binary/<id>`.

### Example: Patient Resource
```json
{
  "name": [
    {
      "given": [
        "John"
      ],
      "family": "Smith"
    }
  ],
  "photo": [
    {
      "url": "http://127.0.0.1:9000/mybucket/John_Smith_20250226.png",
      "title": "John_Smith_20250226.png",
      "contentType": "image/png"
    }
  ],
  "birthDate": "2025-02-26",
  "resourceType": "Patient",
  "id": "8f886cb7-fab3-448b-977c-0b7226b9fe9f",
  "meta": {
    "lastUpdated": "2025-02-26T13:50:59.295229Z",
    "versionId": "38",
    "extension": [
      {
        "url": "ex:createdAt",
        "valueInstant": "2025-02-26T13:50:59.295229Z"
      }
    ]
  }
}
```
Additionally, a [DocumentReference](https://build.fhir.org/documentreference.html) resource can be created to store metadata about the image. See [DocumentReference's scope and usage](https://build.fhir.org/documentreference.html#scope)e.

### Example: DocumentReference Resource
```json
{
  "status": "current",
  "content": [
    {
      "attachment": {
        "url": "http://127.0.0.1:9000/mybucket/John_Smith_20250226.png",
        "title": "John_Smith_20250226.png",
        "contentType": "image/png"
      }
    }
  ],
  "resourceType": "DocumentReference",
  "id": "5e390018-2f27-49a4-839a-4b0e10391bf1",
  "meta": {
    "lastUpdated": "2025-02-26T13:50:59.277060Z",
    "versionId": "37",
    "extension": [
      {
        "url": "ex:createdAt",
        "valueInstant": "2025-02-26T13:50:59.277060Z"
      }
    ]
  }
}

```
