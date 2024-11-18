import { getClients } from "@/lib/aidbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <>
      <PageHeader
        items={[{ href: "/", label: "Home" }, { label: "Clients" }]}
      />
      <div className="flex-1 p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>Grant Types</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.entry?.map(({ resource: client }) => (
                <TableRow key={client?.id}>
                  <TableCell className="font-medium">{client?.id}</TableCell>
                  <TableCell>
                    <Badge
                      variant={client?.first_party ? "default" : "secondary"}
                    >
                      {client?.first_party ? "First Party" : "Third Party"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client?.auth?.authorization_code?.redirect_uri ? (
                      <code className="rounded bg-muted px-1 py-0.5 text-sm">
                        {client?.auth?.authorization_code?.redirect_uri}
                      </code>
                    ) : (
                      "No redirect URI"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client?.grant_types?.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
