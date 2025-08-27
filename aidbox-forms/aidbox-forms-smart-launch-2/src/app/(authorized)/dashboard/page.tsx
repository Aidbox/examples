import { PageHeader } from "@/components/page-header";
import { getSyncStats, saveSyncStats, sync } from "@/lib/server/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncDataChart } from "@/components/sync-data-chart";
import { SyncDataTable } from "@/components/sync-data-table";
import { ago } from "@/lib/utils";
import { getCurrentClient } from "@/lib/server/smart";
import { revalidatePath } from "next/cache";
import { SyncButton } from "@/components/sync-button";

export default async function Page() {
  const stats = await getSyncStats();

  async function refreshAction() {
    "use server";
    const client = await getCurrentClient();
    const resources = await sync(client);
    await saveSyncStats(resources);
    revalidatePath("/dashboard");
  }

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Dashboard" }]}
      />
      <div className="container mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Sync Time
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-row items-center gap-2">
              <div
                className="text-2xl font-bold"
                title={new Date(stats.timestamp).toLocaleString()}
              >
                {ago(new Date(stats.timestamp))}
              </div>

              <SyncButton onClickAction={refreshAction} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Resources Synchronized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(stats.resources).reduce((a, b) => a + b, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 mb-8 items-start">
          <Card>
            <CardHeader>
              <CardTitle>Resources per Type</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncDataChart resources={stats.resources} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resource Type Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncDataTable resources={stats.resources} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
