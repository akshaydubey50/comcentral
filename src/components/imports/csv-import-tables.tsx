import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";

import { formatSalary, formatDate, formatEmploymentType } from "@/lib/formatters";
import type { ImportPreview } from "@/shared/contracts";

export function CsvValidationErrorsTable({
  errors,
}: {
  errors: ImportPreview["errors"];
}) {
  return (
    <TableContainer className="data-table-wrap">
      <Table aria-label="CSV validation errors" size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell>Row</TableCell>
            <TableCell>Field</TableCell>
            <TableCell>Problem</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {errors.map((error, index) => (
            <TableRow key={error.row + "-" + error.field + "-" + index}>
              <TableCell>{error.row}</TableCell>
              <TableCell>{error.field}</TableCell>
              <TableCell>{error.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function CsvEmployeePreviewTable({
  rows,
}: {
  rows: ImportPreview["preview"];
}) {
  return (
    <TableContainer className="data-table-wrap">
      <Table aria-label="Employee import preview" size="small" sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Department / role</TableCell>
            <TableCell>Employment</TableCell>
            <TableCell>Joined</TableCell>
            <TableCell align="right">Salary</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.employeeCode}>
              <TableCell>
                <strong>{row.name}</strong>
                <Typography variant="caption" display="block" color="text.secondary">
                  {row.employeeCode} · {row.email}
                </Typography>
              </TableCell>
              <TableCell>
                {row.department}
                <Typography variant="caption" display="block" color="text.secondary">
                  {row.jobRole}
                </Typography>
              </TableCell>
              <TableCell>{row.country} · {formatEmploymentType(row.employmentType)}</TableCell>
              <TableCell>{formatDate(row.joiningDate)}</TableCell>
              <TableCell align="right">{formatSalary(row.salary, row.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
