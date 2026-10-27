"use client"
import { useState } from 'react';
import { ResponseData } from "./ResponseDisplay";
import { aidboxAWSBucketUrl, aidboxUrl, basicAuthHeader } from "../../constants";

interface GetPatientPhotoFormProps {
  setResponseData: React.Dispatch<React.SetStateAction<ResponseData>>;
}

const GetPatientPhotoForm = ({ setResponseData }: GetPatientPhotoFormProps) => {
  const [getPatientId, setGetPatientId] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [getPhotoResponses, setGetPhotoResponses] = useState<{ photoUrl: string | null }>({
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
      const photo = patientData.photo?.[0];

      if (!photo?.url) {
        throw new Error("Patient does not have a photo.");
      }

      if (photo.url.startsWith("Binary/")) {
        // Offloaded Binary: a raw read returns the bytes, Aidbox fetches them from the bucket.
        const binaryResponse = await fetch(`${aidboxUrl}/${photo.url}`, {
          method: "GET",
          headers: {
            Accept: photo.contentType,
            Authorization: basicAuthHeader,
          },
        });

        if (!binaryResponse.ok) {
          throw new Error(
            `Error fetching Binary: ${binaryResponse.status} ${binaryResponse.statusText}`
          );
        }

        const photoBlob = await binaryResponse.blob();
        setGetPhotoResponses({ photoUrl: URL.createObjectURL(photoBlob) });
        setPhotoError(null);
        setResponseData({
          patientResponse: patientData,
          binaryResponse: `${photoBlob.size} bytes of ${photoBlob.type} streamed by Aidbox from the offload bucket`,
        });
        return;
      }

      const signedUrlResponse = await fetch(`${aidboxAWSBucketUrl}/${photo.title}`, {
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

      setGetPhotoResponses({ photoUrl });
      setPhotoError(null);
      setResponseData({
        patientResponse: patientData,
        signedUrlResponse: signedUrlData
      });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "An unexpected error occurred.");
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
