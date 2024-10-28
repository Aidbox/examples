import { Spinner } from "@/components/spinner.jsx";

export const Loading = () => {
  return (
    <div className="flex-1 grid place-items-center">
      <Spinner width="80" />
    </div>
  );
};
