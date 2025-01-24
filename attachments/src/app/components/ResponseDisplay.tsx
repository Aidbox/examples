"use client"
interface ResponseDisplayProps {
  responseData: any;
}

const ResponseDisplay = ({ responseData }: ResponseDisplayProps) => {
  if (!responseData) return null;

  return (
    <div>
      {responseData && (
        <div className="mt-6 p-4 bg-gray-100 rounded-md shadow space-y-6">
          {responseData.signedUrlResponse && (
            <div className="p-4 border border-gray-300 rounded-md bg-white">
              <h2 className="text-lg font-semibold mb-2">Signed URL Response:</h2>
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(responseData.signedUrlResponse, null, 2)}
              </pre>
            </div>
          )}
          {responseData.patientResponse && (
            <div className="p-4 border border-gray-300 rounded-md bg-white">
              <h2 className="text-lg font-semibold mb-2">Patient Response:</h2>
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(responseData.patientResponse, null, 2)}
              </pre>
            </div>
          )}
          {responseData.documentReferenceResponse && (
            <div className="p-4 border border-gray-300 rounded-md bg-white">
              <h2 className="text-lg font-semibold mb-2">Document Reference Response:</h2>
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(responseData.documentReferenceResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseDisplay;
