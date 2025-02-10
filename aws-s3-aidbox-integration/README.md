# AWS S3 Aidbox integration example
![image](https://github.com/user-attachments/assets/fb3026ef-be1f-4ef8-845e-064e463adb0f)
This guide demonstrates how to integrate [AWS S3 with Aidbox](https://docs.aidbox.app/storage-1/s3-compatible-storages/aws-s3) using a front-end application exclusively. 

The application enables saving and retrieving a patient's photo in an AWS S3 bucket via Aidbox, which acts as a middleware between the front-end and AWS S3. Aidbox manages the **Access Key ID** and **Secret Access Key** for an IAM user or role through an AwsAccount resource.

## Setting Up Aidbox

1. Start Aidbox and log in using the Aidbox Portal (See [Getting Started Guide](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker/run-aidbox-locally#id-4.-activate-your-aidbox-instance)):

```
docker compose up
```

2. Create an AwsAccount resource to store AWS credentials and region settings:

```http
PUT /AwsAccount

id: my-account
access-key-id: <your-key-id> # e.g. AKIAIOSFODNN7EXAMPLE
secret-access-key: <your-secret-access-key> # e.g. wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region: us-east-1
```

3. **Set up a [Basic Client](https://docs.aidbox.app/modules/security-and-access-control/auth/basic-auth)** to allow front-end requests:
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
4. **Define an Access Policy** to permit basic authentication:
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

5. **Configure CORS on AWS side**:
Use [this page](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html) to allow front-end to interact with the bucket.
Here's how your configuration JSON file should look like:
```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "GET",
            "DELETE"
        ],
        "AllowedOrigins": [
            "http://localhost:3000"
        ],
        "ExposeHeaders": []
    }
]
```

## Running the application
1. Clone the repository 
```bash
git clone git@github.com:Aidbox/examples.git 
```
2. Change the directory to the current example.
3. Install dependencies:
```bash
npm install
```
4. Start the development server:
```bash
npm run dev
```
5. Go to `http://localhost:3000`.

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
2. Receive a [pre-signed URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) from Aidbox:
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/patient.png?..."
}
```
3. Upload the file directly to AWS S3 by sending a POST request to the pre-signed URL. The file content (e.g., the patient's photo) is sent in the request body and saved in the bucket.

## Retrieving a File from the Bucket: Workflow
1. Send a GET request from the front-end to Aidbox with the filename:
```http
GET /aws/storage/<your-account-id-in-aidbox>/<your-bucket-name>/<filename>
```
2. Receive a [presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) from Aidbox: 
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/<filename>?..."
}
```
3. Use GET request to the URL to retrieve the file.
For images, an <img> HTML tag can be used to render the image directly:
```react
<img
  src="https://<your-bucket-name>.s3.amazonaws.com/<filename>?..."
/>
```

## FHIR & binary files
In this example, the [Attachment](https://build.fhir.org/datatypes.html#attachment) FHIR datatype is used to store the file's URL. Specifically, the Patient.photo field contains an attachment representing the saved photo.

### Example: Patient Resource
```json
{
  "resourceType": "Patient",
  "id": "e5ca087b-ec71-40a7-8c9b-e6093e8f1fdc",
  "photo": [
    {
      "url": "https://thebucket.s3.amazonaws.com/john_smith_20000101.png",
      "title": "john_smith_20000101.png",
      "contentType": "image/png"
    }
  ],
  "name": [
    {
      "given": [
        "john"
      ],
      "family": "smith"
    }
  ],
  "birthDate": "2000-01-01"
}
```
Additionally, a [DocumentReference](https://build.fhir.org/documentreference.html) resource can be created to store metadata about the image. See [DocumentReference's scope and usage](https://build.fhir.org/documentreference.html#scope)e.

### Example: DocumentReference Resource
```json
{
  "resourceType": "DocumentReference",
  "id": "f2473702-99eb-4efd-be07-8fa8ff21828c",
  "status": "current",
  "content": [
    {
      "attachment": {
        "url": "https://thebucket.s3.amazonaws.com/john_smith_20000101.png",
        "title": "john_smith_20000101.png",
        "contentType": "image/png"
      }
    }
  ]
}

```
