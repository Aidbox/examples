import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import { Navigate, Outlet } from "react-router-dom";
import { useToast } from "@/hooks/use-toast.js";
import { useEffect } from "react";

export const PractitionerOnly = () => {
  const { user } = useLaunchContext();
  const { toast } = useToast();

  const allowed = user.resourceType === "Practitioner";

  useEffect(() => {
    if (!allowed) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only practitioners can access this page.",
      });
    }
  }, []);

  return allowed ? <Outlet /> : <Navigate to={"/"} />;
};
