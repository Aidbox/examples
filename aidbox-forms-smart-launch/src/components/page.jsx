import { SidebarInset, SidebarProvider } from "@/ui/sidebar.jsx";
import { Header } from "@/components/header.jsx";
import { Sidebar } from "@/components/sidebar.jsx";
import * as React from "react";
import { Suspense } from "react";
import { LaunchContextProvider } from "@/hooks/use-launch-context.jsx";
import { ClientProvider } from "@/hooks/use-client.jsx";
import { Outlet } from "react-router-dom";
import { Loading } from "@/components/loading.jsx";

export const Page = () => {
  return (
    <ClientProvider>
      <LaunchContextProvider>
        <SidebarProvider style={{ "--sidebar-width": "18rem" }}>
          <div className="flex h-screen flex-col w-full">
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <SidebarInset className="flex-1">
                <Header />
                <Suspense fallback={<Loading />}>
                  <Outlet />
                </Suspense>
              </SidebarInset>
            </div>
          </div>
        </SidebarProvider>
      </LaunchContextProvider>
    </ClientProvider>
  );
};
