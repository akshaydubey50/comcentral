"use client";

import { type ChangeEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";

import { EmptyState } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { api, downloadBlob } from "@/lib/api-client";
import { CsvEmployeePreviewTable, CsvValidationErrorsTable } from "./csv-import-tables";
import { type ImportCommitInput, useCsvImportState } from "./use-csv-import-state";

export function CsvImportWorkflow() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<number | null>(null);
  const csv = useCsvImportState();
  const template = useMutation({
    mutationFn: api.importTemplate,
    onSuccess: (blob) =>
      downloadBlob(blob, "acme-employee-import-template.csv"),
  });
  const commit = useMutation({
    mutationFn: ({ text, hash }: ImportCommitInput) => api.commitImport(text, hash),
    onSuccess: async ({ imported }) => {
      setResult(imported);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["directory-options"] });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    commit.reset();
    setResult(null);
    void csv.selectFile(event);
  }

  const previewData = csv.reviewed?.preview;
  const busy = csv.preview.isPending || commit.isPending;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Data migration"
        title="Import employees from CSV"
        description="Validate up to 10,000 new employee records before saving the entire batch. Columns may be in any order. Salaries can be added later."
        actions={
          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={() => template.mutate()}
            disabled={template.isPending}
          >
            {template.isPending ? "Downloading…" : "Download template"}
          </Button>
        }
      />
      {(template.isError || csv.preview.isError || commit.isError) && (
        <Alert severity="error" role="alert">
          {template.isError
            ? "The template could not be downloaded."
            : csv.preview.isError
              ? csv.preview.error.message
              : commit.error?.message}
        </Alert>
      )}
      <Stack direction="row" gap={1} flexWrap="wrap" aria-label="Import steps">
        <Chip
          label="1. Select file"
          color={csv.csvText ? "success" : "default"}
          variant={csv.csvText ? "filled" : "outlined"}
        />
        <Chip
          label="2. Review validation"
          color={
            previewData ? (previewData.valid ? "success" : "error") : "default"
          }
          variant={previewData ? "filled" : "outlined"}
        />
        <Chip
          label="3. Confirm import"
          color={result !== null ? "success" : "default"}
          variant={result !== null ? "filled" : "outlined"}
        />
      </Stack>
      {busy && (
        <LinearProgress
          aria-label={
            csv.preview.isPending ? "Validating CSV" : "Importing employees"
          }
        />
      )}
      {result !== null ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <CheckCircle2 size={42} color="#3b7d5b" aria-hidden />
            <Typography component="h2" variant="h2" sx={{ mt: 1.5 }}>
              Import complete
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {result.toLocaleString()} employees were added together with no
              partial batch.
            </Typography>
            <Button sx={{ mt: 2.5 }} variant="contained" href="/employees">
              View employee directory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
                gap={2}
              >
                <Stack direction="row" gap={1.5} alignItems="center">
                  <FileSpreadsheet size={26} color="#0b625e" aria-hidden />
                  <Box>
                    <Typography component="h2" variant="h3">
                      Choose an employee CSV
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      CSV only · maximum 2 MB · maximum 10,000 rows
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<Upload size={18} />}
                  disabled={busy}
                >
                  Choose CSV
                  <input
                    hidden
                    type="file"
                    accept=".csv,text/csv"
                    disabled={busy}
                    onClick={(event) => {
                      event.currentTarget.value = "";
                    }}
                    onChange={selectFile}
                  />
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Use the template field names, or id for employeeCode, fullName
                for name, jobTitle for jobRole, and hireDate for joiningDate.
                Include each field once. Omit salary or leave it blank to save
                an employee with salary pending. When provided, salary must be
                annual base pay in major currency units.
              </Typography>
              {csv.fileName && (
                <Alert severity={csv.fileError ? "error" : "info"} sx={{ mt: 2 }}>
                  {csv.fileError ?? (csv.reading ? "Reading " + csv.fileName + "…" : csv.fileName + " is ready to validate.")}
                </Alert>
              )}
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={csv.validate}
                  disabled={!csv.csvText || csv.reading || busy}
                >
                  Validate and preview
                </Button>
              </Stack>
            </CardContent>
          </Card>
          {previewData && (
            <Card>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Box>
                      <Typography component="h2" variant="h2">
                        Validation result
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {previewData.totalRows.toLocaleString()} rows checked
                        against current employee codes and all required field
                        rules.
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        previewData.valid
                          ? "Ready to import"
                          : previewData.errorCount + " errors"
                      }
                      color={previewData.valid ? "success" : "error"}
                    />
                  </Stack>
                  {!previewData.valid && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Nothing has been saved. Correct every error in the CSV,
                      then choose the updated file and validate again.
                    </Alert>
                  )}
                  {previewData.valid && previewData.salaryPendingCount > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {previewData.salaryPendingCount.toLocaleString()}{" "}
                      {previewData.salaryPendingCount === 1 ? "employee will" : "employees will"}{" "}
                      be saved with salary pending. These employees are visible
                      in the directory and excluded from pay statistics until a
                      salary is added. Use Add salary on their employee details.
                    </Alert>
                  )}
                </Box>
                <Divider />
                {previewData.errors.length > 0 && (
                  <CsvValidationErrorsTable errors={previewData.errors} />
                )}
                {previewData.errorCount > previewData.errors.length && (
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ px: 3, py: 1.5 }}
                  >
                    {previewData.errorCount - previewData.errors.length}{" "}
                    additional errors are not shown. Fix the returned rows
                    before validating again.
                  </Typography>
                )}
                {previewData.preview.length > 0 && (
                  <>
                    <Box sx={{ px: 3, pt: 3 }}>
                      <Typography component="h3" variant="h3">
                        First {previewData.preview.length} rows
                      </Typography>
                    </Box>
                    <CsvEmployeePreviewTable rows={previewData.preview} />
                  </>
                )}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ sm: "center" }}
                  gap={2}
                  sx={{ p: 3, bgcolor: "#f7f8f5" }}
                >
                  <Typography variant="body2">
                    The unchanged file is checked again when you confirm. Any
                    new conflict saves no rows.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => csv.reviewed && commit.mutate(csv.reviewed.commitInput)}
                    disabled={!previewData.valid || busy}
                  >
                    Confirm and import {previewData.totalRows.toLocaleString()}{" "}
                    employees
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
          {!previewData && !csv.csvText && (
            <EmptyState
              title="No CSV selected"
              description="Download the template and fill the employee details, then choose the file to validate it. Salary may be left blank and added later. Each file can contain up to 10,000 employee rows."
            />
          )}
        </>
      )}
    </Stack>
  );
}
