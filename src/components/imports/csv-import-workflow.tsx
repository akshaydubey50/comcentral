"use client";

import { ChangeEvent, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";

import { EmptyState } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { api, downloadBlob } from "@/lib/api-client";
import {
  formatCurrency,
  formatDate,
  formatEmploymentType,
} from "@/lib/formatters";

const maxBytes = 2 * 1024 * 1024;

export function CsvImportWorkflow() {
  const queryClient = useQueryClient();
  const fileReadSequence = useRef(0);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const template = useMutation({
    mutationFn: api.importTemplate,
    onSuccess: (blob) =>
      downloadBlob(blob, "acme-employee-import-template.csv"),
  });
  const preview = useMutation({ mutationFn: (text: string) => api.previewImport(text) });
  const commit = useMutation({
    mutationFn: ({ text, hash }: { text: string; hash: string }) => api.commitImport(text, hash),
    onSuccess: async ({ imported }) => {
      setResult(imported);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["directory-options"] });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const readSequence = ++fileReadSequence.current;
    const file = event.target.files?.[0];
    preview.reset();
    commit.reset();
    setResult(null);
    setFileError(null);
    setCsvText("");
    setReading(false);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > maxBytes) {
      setFileError(
        "The file is larger than 2 MB. Split it into a batch of at most 10,000 employees.",
      );
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (readSequence !== fileReadSequence.current) return;
      if (!text.trim()) {
        setFileError("The CSV file is empty. Choose a completed template.");
        return;
      }
      setCsvText(text);
    } catch {
      if (readSequence === fileReadSequence.current) {
        setFileError(
          "The CSV file could not be read. Choose a different file.",
        );
      }
    } finally {
      if (readSequence === fileReadSequence.current) setReading(false);
    }
  }

  const previewData = preview.data;
  const busy = preview.isPending || commit.isPending;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Data migration"
        title="Import employees from CSV"
        description="Use the fixed ACME template to validate up to 10,000 new employee records before saving the entire batch."
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
      {(template.isError || preview.isError || commit.isError) && (
        <Alert severity="error" role="alert">
          {template.isError
            ? "The template could not be downloaded."
            : preview.isError
              ? preview.error.message
              : commit.error?.message}
        </Alert>
      )}
      <Stack direction="row" gap={1} flexWrap="wrap" aria-label="Import steps">
        <Chip
          label="1. Select file"
          color={csvText ? "success" : "default"}
          variant={csvText ? "filled" : "outlined"}
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
            preview.isPending ? "Validating CSV" : "Importing employees"
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
                      Choose a completed template
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
              {fileName && (
                <Alert severity={fileError ? "error" : "info"} sx={{ mt: 2 }}>
                  {fileError ?? (reading ? "Reading " + fileName + "…" : fileName + " is ready to validate.")}
                </Alert>
              )}
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => preview.mutate(csvText)}
                  disabled={!csvText || reading || busy}
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
                </Box>
                <Divider />
                {previewData.errors.length > 0 && (
                  <TableContainer className="data-table-wrap">
                    <Table
                      aria-label="CSV validation errors"
                      size="small"
                      sx={{ minWidth: 640 }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Field</TableCell>
                          <TableCell>Problem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.errors.map((error, index) => (
                          <TableRow
                            key={error.row + "-" + error.field + "-" + index}
                          >
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.field}</TableCell>
                            <TableCell>{error.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
                    <TableContainer className="data-table-wrap">
                      <Table
                        aria-label="Employee import preview"
                        size="small"
                        sx={{ minWidth: 900 }}
                      >
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
                          {previewData.preview.map((row) => (
                            <TableRow key={row.employeeCode}>
                              <TableCell>
                                <strong>{row.name}</strong>
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {row.employeeCode} · {row.email}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {row.department}
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {row.jobRole}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {row.country} ·{" "}
                                {formatEmploymentType(row.employmentType)}
                              </TableCell>
                              <TableCell>
                                {formatDate(row.joiningDate)}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(row.salary, row.currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
                    onClick={() => commit.mutate({ text: csvText, hash: previewData.previewHash })}
                    disabled={!previewData.valid || busy}
                  >
                    Confirm and import {previewData.totalRows.toLocaleString()}{" "}
                    employees
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
          {!previewData && !csvText && (
            <EmptyState
              title="No CSV selected"
              description="Download the template, enter employee details without changing its headers, and return here to validate the file."
            />
          )}
        </>
      )}
    </Stack>
  );
}
