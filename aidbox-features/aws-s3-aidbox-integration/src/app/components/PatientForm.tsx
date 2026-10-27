"use client"
import { useState } from 'react';
import { ResponseData } from "./ResponseDisplay";
import { aidboxAWSBucketUrl, aidboxUrl, basicAuthHeader } from "../../constants";

interface PatientFormProps {
  setResponseData: React.Dispatch<React.SetStateAction<ResponseData>>;
}

type Approach = "presigned" | "offload";

const PatientForm = ({ setResponseData }: PatientFormProps) => {
  const [approach, setApproach] = useState<Approach>("presigned");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fileExtension(filename: string): string {
    const parts = filename.split(".");
    if (parts.length === 1) {
      return "";
    }
    return parts[parts.length - 1];
  }

  function getFileName(prevFilename: string, firstName: string, lastName: string, dob: string): string {
    return `${firstName}_${lastName}_${dob.replace(/-/g, "")}.${fileExtension(prevFilename)}`;
  }

  function removeQueryString(url: string): string {
    return url.split("?")[0];
  }

  async function deleteBinary(binaryUrl: string): Promise<void> {
    await fetch(`${aidboxUrl}/${binaryUrl}`, {
      method: "DELETE",
      headers: { Authorization: basicAuthHeader },
    });
  }

  async function deleteFile(filename: string): Promise<void> {
    const signedUrlResponse = await fetch(`${aidboxAWSBucketUrl}/${filename}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader,
      }
    });

    if (!signedUrlResponse.ok) {
      throw new Error(`Delete error: ${signedUrlResponse.status} ${signedUrlResponse.statusText}`);
    }

    const signedUrlData = await signedUrlResponse.json();
    const fileSendUrl = signedUrlData.url;

    await fetch(fileSendUrl, {
      method: "DELETE"
    });
  }

  // Approach 1: Aidbox signs a URL, the browser uploads straight to the bucket.
  async function uploadWithPresignedUrl(file: File, filename: string) {
    const signedUrlResponse = await fetch(aidboxAWSBucketUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader,
      },
      body: JSON.stringify({ filename: filename }),
    });

    if (!signedUrlResponse.ok) {
      throw new Error(`Error: ${signedUrlResponse.status} ${signedUrlResponse.statusText}`);
    }

    const signedUrlData = await signedUrlResponse.json();
    const fileSendUrl = signedUrlData.url;

    const fileUploadResponse = await fetch(fileSendUrl, {
      method: "PUT",
      body: file,
    });

    if (!fileUploadResponse.ok) {
      throw new Error(
        `Error uploading file to URL ${fileSendUrl} : ${fileUploadResponse.status} ${fileUploadResponse.statusText}`
      );
    }

    return { url: removeQueryString(fileSendUrl), responses: { signedUrlResponse: signedUrlData } };
  }

  // Approach 2: the browser posts the raw file to /fhir/Binary, Aidbox streams it to the bucket
  // and keeps only a pointer in the database.
  async function uploadAsOffloadedBinary(file: File) {
    const binaryResponse = await fetch(`${aidboxUrl}/Binary`, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        Authorization: basicAuthHeader,
      },
      body: file,
    });

    if (!binaryResponse.ok) {
      throw new Error(`Error creating Binary: ${binaryResponse.status} ${binaryResponse.statusText}`);
    }

    const binaryData = await binaryResponse.json();
    return { url: `Binary/${binaryData.id}`, responses: { binaryResponse: binaryData } };
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (
      selectedFile &&
      (selectedFile.type === "image/jpeg" || selectedFile.type === "image/png")
    ) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Only JPG or PNG files are allowed.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Please upload a JPEG or PNG file.");
      return;
    }

    try {
      const filename = getFileName(file.name, formData.firstName, formData.lastName, formData.dob);

      const upload = approach === "presigned"
        ? await uploadWithPresignedUrl(file, filename)
        : await uploadAsOffloadedBinary(file);
      const cleanup = () => approach === "presigned" ? deleteFile(filename) : deleteBinary(upload.url);

      const documentReferenceResponse = await fetch(`${aidboxUrl}/DocumentReference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: basicAuthHeader,
        },
        body: JSON.stringify({
          status: "current",
          content: [
            {
              attachment: {
                url: upload.url,
                title: filename,
                contentType: "image/" + fileExtension(filename),
              },
            },
          ],
        }),
      });

      if (!documentReferenceResponse.ok) {
        await cleanup();
        throw new Error(
          `Error creating DocumentReference: ${documentReferenceResponse.status} ${documentReferenceResponse.statusText}`
        );
      }

      const documentReferenceData = await documentReferenceResponse.json();

      const patientResponse = await fetch(`${aidboxUrl}/Patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: basicAuthHeader,
        },
        body: JSON.stringify({
          resourceType: "Patient",
          name: [
            {
              family: formData.lastName,
              given: [formData.firstName],
            },
          ],
          birthDate: formData.dob,
          photo: [
            {
              title: filename,
              contentType: "image/" + fileExtension(filename),
              url: upload.url,
            },
          ],
        }),
      });

      if (!patientResponse.ok) {
        await cleanup();
        throw new Error(
          `Error creating Patient: ${patientResponse.status} ${patientResponse.statusText}`
        );
      }

      const patientData = await patientResponse.json();

      setResponseData({
        patientResponse: patientData,
        ...upload.responses,
        documentReferenceResponse: documentReferenceData,
      });
      setError(null);
    } catch (err) {
      setError("error! " + (err instanceof Error ? err.message : "An unexpected error occurred."));
    }
  };

  return (
    <form
      className="w-full max-w-lg p-6 bg-white rounded-lg shadow-md"
      onSubmit={handleSubmit}
    >
      <h1 className="text-xl font-semibold text-gray-800 mb-6">
        Patient Form
      </h1>
      <fieldset className="mb-6">
        <legend className="block text-sm font-medium text-gray-700 mb-2">Storage approach</legend>
        <label className="flex items-start gap-2 mb-2 text-sm text-gray-700">
          <input
            type="radio"
            name="approach"
            value="presigned"
            checked={approach === "presigned"}
            onChange={() => setApproach("presigned")}
            className="mt-1"
          />
          <span><b>Presigned URL</b>: the browser uploads directly to the bucket</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="approach"
            value="offload"
            checked={approach === "offload"}
            onChange={() => setApproach("offload")}
            className="mt-1"
          />
          <span><b>Binary data offload</b>: the browser posts to <code>/fhir/Binary</code>, Aidbox stores the bytes in the bucket</span>
        </label>
      </fieldset>
      <div className="mb-4">
        <label
          htmlFor="firstName"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          First Name
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-500"
          placeholder="Your first name"
          required
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="lastName"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Last Name
        </label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-500"
          placeholder="Your last name"
          required
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="dob"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Birthdate
        </label>
        <input
          type="date"
          id="dob"
          name="dob"
          value={formData.dob}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-500"
          required
        />
      </div>
      <div className="mb-4">
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          File
        </label>
        <input
          type="file"
          id="file"
          name="file"
          className="w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
      >
        Submit
      </button>
    </form>

  );
};

export default PatientForm;
