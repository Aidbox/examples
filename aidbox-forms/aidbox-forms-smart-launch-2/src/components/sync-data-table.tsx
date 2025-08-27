import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SyncStats } from "@/lib/server/sync";

export function SyncDataTable({
  resources,
}: {
  resources: SyncStats["resources"];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resource Type</TableHead>
          <TableHead className="text-right">Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(resources)
          .sort(([resourceType1], [resourceType2]) =>
            resourceType1.localeCompare(resourceType2),
          )
          .map(([resourceType, count]) => (
            <TableRow key={resourceType}>
              <TableCell>{resourceType}</TableCell>
              <TableCell className="text-right">{count}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
