# AWS S3 Aidbox integration example

This example demonstrates how to use [AWS S3 Aidbox integration](https://docs.aidbox.app/storage-1/s3-compatible-storages/aws-s3) using front-end application only.
This application allows front-end to save Patient photo to the AWS S3 bucket, and also access it. 
Aidbox is a middleware between front-end and AWS S3. Aidbox knows the access key id and secret access key for an IAM user or role in AWS from created AwsAccount Aidbox resource.

## The save file to bucket flow
1. Front-end sends a POST request to Aidbox with filename to write to.
```http
POST /aws/storage/<your-account-id-in-aidbox>/<your-bucket-name>

filename: patient.png
```
2. Aidbox answers with [presigned AWS URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/patient.png?..."
}
```
3. Front-end sends POST request to this url. The body is a binary file, e.g. patient photo. The file as saved in the bucket.

## The get file from bucket flow
1. Front-end sends a request to Aidbox with filename to get to.
```http
GET /aws/storage/<your-account-id-in-aidbox>/<your-bucket-name>/<filename>
```
2. Aidbox answers with [presigned AWS URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
```json
{
  "url": "https://<your-bucket-name>.s3.amazonaws.com/<filename>?..."
}
```
3. Front-end sends GET request to this url. If it is image, `<img>` html tag can be used to render the image.
```react
<img
  src="https://<your-bucket-name>.s3.amazonaws.com/<filename>?..."
/>
```

## FHIR & binary files
In this example, we use [Attachment](https://build.fhir.org/datatypes.html#attachment) FHIR datatype to store the file url.
More specifically, we use Patient.photo, which is Attachment.
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
We also create [DocumentReference](https://build.fhir.org/documentreference.html) resource to save the image. See [DocumentReference's scope and usage](https://build.fhir.org/documentreference.html#scope).
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

## Setup Aidbox

1. Create an instance of AwsAccount that contains access credentials and region settings.

```http
PUT /AwsAccount

id: my-account
access-key-id: <your-key-id> # e.g. AKIAIOSFODNN7EXAMPLE
secret-access-key: <your-secret-access-key> # e.g. wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region: us-east-1
```

2. Create [Basic Client](https://docs.aidbox.app/modules/security-and-access-control/auth/basic-auth) to allow front-end any request.

```http
PUT/Client/basic?_pretty=true
content-type: application/json
accept: application/json

{
 "secret": "secret",
 "grant_types": [
  "basic"
 ]
}
```

```http
PUT/AccessPolicy/basic-policy?_pretty=true
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

3. Now you can send requests from front-end using basic authorization header:
```
"Authorization": "Basic YmFzaWM6c2VjcmV0"
```

## Run application

```bash
npm install
```

```bash
npm run dev
```
