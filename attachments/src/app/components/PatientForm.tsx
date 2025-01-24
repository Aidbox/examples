"use client"
import { useState } from 'react';
import { aidboxAWSBucketUrl, aidboxUrl, basicAuthHeader } from "../../constants";

interface PatientFormProps {
  setResponseData: React.Dispatch<React.SetStateAction<any>>;
}

const PatientForm = ({ setResponseData }: PatientFormProps) => {
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
      const newFileName = getFileName(file.name, formData.firstName, formData.lastName, formData.dob);

      const signedUrlResponse = await fetch(aidboxAWSBucketUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: basicAuthHeader,
        },
        body: JSON.stringify({ filename: newFileName }),
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
                url: removeQueryString(fileSendUrl),
                title: newFileName,
                contentType: "image/" + fileExtension(newFileName),
              },
            },
          ],
        }),
      });

      if (!documentReferenceResponse.ok) {
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
              title: newFileName,
              contentType: "image/" + fileExtension(newFileName),
              url: removeQueryString(fileSendUrl),
            },
          ],
        }),
      });

      if (!patientResponse.ok) {
        throw new Error(
          `Error creating Patient: ${patientResponse.status} ${patientResponse.statusText}`
        );
      }

      const patientData = await patientResponse.json();

      setResponseData({
        patientResponse: patientData,
        signedUrlResponse: signedUrlData,
        documentReferenceResponse: documentReferenceData,
      });
      setError(null);
    } catch (err: any) {
      setError("error! " + (err.message || "An unexpected error occurred."));
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
