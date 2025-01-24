"use client";
import { useState } from "react";
import PatientForm from './components/PatientForm';
import GetPatientPhotoForm from './components/GetPatientPhotoForm';
import ResponseDisplay from './components/ResponseDisplay';

function App() {
  const [addResponseData, setAddResponseData] = useState<any>(null);
  const [getResponseData, setGetResponseData] = useState<any>(null);

  return (
    <div className="min-h-screen p-8 pb-20 font-[family-name:var(--font-geist-sans)] bg-gray-50">
      <div className="container max-w-screen-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex flex-col gap-8 bg-white p-6 rounded-lg shadow-md">
          <PatientForm setResponseData={setAddResponseData} />
          <GetPatientPhotoForm setResponseData={setGetResponseData} />
        </div>

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Add Patient & Photo Aidbox Responses</h2>
          <ResponseDisplay responseData={addResponseData} />
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Get Patient & Photo Aidbox Responses</h2>
          <ResponseDisplay responseData={getResponseData} />
        </section>
      </div>
    </div>
  );
}

export default App;
