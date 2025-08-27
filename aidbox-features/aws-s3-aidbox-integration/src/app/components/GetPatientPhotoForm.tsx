"use client"
import { useState } from 'react';
import { aidboxAWSBucketUrl, aidboxUrl, basicAuthHeader } from "../../constants";

interface GetPatientPhotoFormProps {
  setResponseData: React.Dispatch<React.SetStateAction<any>>;
}

const GetPatientPhotoForm = ({ setResponseData }: GetPatientPhotoFormProps) => {
  const [getPatientId, setGetPatientId] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [getPhotoResponses, setGetPhotoResponses] = useState<any>({
    patientResponse: null,
    signedUrlResponse: null,
    photoUrl: null,
  });

  const handleGetPhotoSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!getPatientId) {
      setPhotoError("Please provide a valid Patient ID.");
      return;
    }

    try {
      const patientResponse = await fetch(`${aidboxUrl}/Patient/${getPatientId}`, {
        method: "GET",
        headers: {
          Authorization: basicAuthHeader,
        },
      });

      if (!patientResponse.ok) {
        throw new Error(
          `Error fetching Patient: ${patientResponse.status} ${patientResponse.statusText}`
        );
      }

      const patientData = await patientResponse.json();
      const title = patientData.photo?.[0]?.title;

      if (!title) {
        throw new Error("Patient does not have a photo title.");
      }

      const signedUrlResponse = await fetch(`${aidboxAWSBucketUrl}/${title}`, {
        method: "GET",
        headers: {
          Authorization: basicAuthHeader,
        },
      });

      if (!signedUrlResponse.ok) {
        throw new Error(
          `Error fetching signed URL: ${signedUrlResponse.status} ${signedUrlResponse.statusText}`
        );
      }

      const signedUrlData = await signedUrlResponse.json();
      const photoUrl = signedUrlData.url;

      setGetPhotoResponses({
        patientResponse: JSON.stringify(patientData, null, 2),
        signedUrlResponse: JSON.stringify(signedUrlData, null, 2),
        photoUrl,
      });
      setPhotoError(null);
      setResponseData({
        patientResponse: patientData,
        signedUrlResponse: signedUrlData
      });
    } catch (err: any) {
      setPhotoError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div>
      <form
        className="w-full max-w-lg p-6 bg-gray-50 border border-gray-300 rounded-lg shadow-md"
        onSubmit={handleGetPhotoSubmit}
      >
        <h1 className="text-xl font-semibold text-gray-700 mb-6">
          Get Patient Photo
        </h1>
        <div className="mb-4">
          <label
            htmlFor="patientId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Patient ID
          </label>
          <input
            type="text"
            id="patientId"
            name="patientId"
            value={getPatientId}
            onChange={(e) => setGetPatientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-500"
            placeholder="Enter Patient ID"
            required
          />
        </div>
        {photoError && (
          <p className="text-red-500 text-sm mb-4">{photoError}</p>
        )}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
        >
          Get Photo
        </button>
      </form>

      {getPhotoResponses.photoUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Patient Photo</h2>
          <img
            src={getPhotoResponses.photoUrl}
            alt="Patient"
            width={500}
            height={500}
            className="rounded-md shadow-md"
          />
        </div>
      )}
    </div>
  );
};

export default GetPatientPhotoForm;
