# AWS S3 Aidbox integration example
![image](https://github.com/user-attachments/assets/fb3026ef-be1f-4ef8-845e-064e463adb0f)
This guide demonstrates how to integrate [S3-compatible storage with Aidbox](https://docs.aidbox.app/storage-1/s3-compatible-storages/aws-s3) using [min.io](https://github.com/minio/minio) and a front-end application exclusively. 

The application enables saving and retrieving a patient's photo in an AWS S3 bucket via Aidbox, which acts as a middleware between the front-end and AWS S3. Aidbox manages the **Access Key ID** and **Secret Access Key** for an IAM user or role through an AwsAccount resource.

## Setting Up Aidbox
1. Clone the repository 
```bash
git clone git@github.com:Aidbox/examples.git 
```
2. Change the directory to the current example.
3. Start Aidbox, AidboxDB, and min.io.
```bash
docker compose up
```
4. Go to http://localhost:9001 and log in to min.io using username `minioadmin` and password `minioadmin`. 
5. In Object Browser, click on the "Create Bucket" link. **Create a bucket with "mybucket" name**.
6. In the navigation, click on Access Keys section. Create Access Key. Copy `Access Key` and `Secret Key`. Click "Create".
7. Go to http://localhost:8888 and log in to Aidbox using the Aidbox Portal (See [Getting Started Guide](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker/run-aidbox-locally#id-4.-activate-your-aidbox-instance)):
8. Create an AwsAccount resource to store AWS credentials and region settings:
```http
PUT /AwsAccount/my-account

id: my-account
access-key-id: <your-access-key> # e.g. ugQPrWcctDQuzdAzufXh
secret-access-key: <your-secret-access-key> # e.g. bUqJWhOimudbEGUHj3indSnAULtwqpwqBOnqO6Rm
region: us-east-1
host: 127.0.0.1:9000
path-style: true
use-ssl: false
```
9. **Set up a [Basic Client](https://docs.aidbox.app/modules/security-and-access-control/auth/basic-auth)** to allow front-end requests:
```http
PUT /Client/basic?_pretty=true
content-type: application/json
accept: application/json

{
 "secret": "secret",
 "grant_types": [
  "basic"
 ]
}
```
10. **Define an Access Policy** to permit basic authentication:
```http
PUT /AccessPolicy/basic-policy?_pretty=true
content-type: application/json
accept: application/json

{
 "engine": "allow",
 "link": [
  {
   "id": "basic",
   "resourceType": "Client"
  }
 ]
}
```
Now we can use Basic Authorization header in the front-end:
```
"Authorization": "Basic YmFzaWM6c2VjcmV0"
```
We use it in `src/constants.ts` file.

## Running the application
1. Install dependencies:
```bash
npm install
```
2. Start the development server:
```bash
npm run dev
```
3. Go to `http://localhost:3000`.

To save Patient and DocumentReference resources and the photo in the bucket:
- Fill the patient form,
- Attach the patient photo,
- Press submit button.
To get Patient photo by the id, type the id and press Get Photo button.

# What's going on under the hood?
## Saving a File to the Bucket: Workflow
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

MinIO:
```json
{
  "url": "http://127.0.0.1:9000/mybucket/John_Smith_20250226.png?..."
}
```
3. Upload the file directly to S3 by sending a POST request to the pre-signed URL. The file content (e.g., the patient's photo) is sent in the request body and saved in the bucket.

## Retrieving a File from the Bucket: Workflow
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

MinIO:
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

## FHIR & binary files
In this example, the [Attachment](https://build.fhir.org/datatypes.html#attachment) FHIR datatype is used to store the file's URL. Specifically, the Patient.photo field contains an attachment representing the saved photo.

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
