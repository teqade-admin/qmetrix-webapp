import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataTable({ columns, data, isLoading, onRowClick, emptyMessage = "No records found" }) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.cellClassName}>
                  {col.render ? col.render(row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}