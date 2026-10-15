import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  previewImport: vi.fn(),
  commitImport: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    importTemplate: vi.fn(),
    previewImport: mocks.previewImport,
    commitImport: mocks.commitImport,
  },
  downloadBlob: vi.fn(),
}));

import { CsvImportWorkflow } from './csv-import-workflow';

const validPreview = {
  valid: true,
  totalRows: 1,
  salaryPendingCount: 0,
  preview: [{
    employeeCode: 'ACME-001',
    name: 'Ada Lovelace',
    email: 'ada@acme.test',
    country: 'GB',
    department: 'Engineering',
    jobRole: 'Principal Engineer',
    employmentType: 'FULL_TIME' as const,
    joiningDate: '2020-01-02',
    salary: '125000.00',
    currency: 'GBP' as const,
  }],
  errors: [],
  errorCount: 0,
  previewHash: 'server-hash',
};

function renderWorkflow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><CsvImportWorkflow /></QueryClientProvider>);
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function csvFile(name: string, text: () => Promise<string>) {
  const file = new File(['csv'], name, { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: text });
  return file;
}

describe('CsvImportWorkflow', () => {
  beforeEach(() => {
    mocks.previewImport.mockReset();
    mocks.commitImport.mockReset();
  });

  it('commits only the server-validated file and preview hash after confirmation', async () => {
    mocks.previewImport.mockResolvedValue(validPreview);
    mocks.commitImport.mockResolvedValue({ imported: 1 });
    const input = renderWorkflow();
    fireEvent.change(input, { target: { files: [csvFile('people.csv', () => Promise.resolve('employeeCode,name'))] } });

    expect(await screen.findByText(/people.csv is ready to validate/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm and import 1 employee/i }));

    await waitFor(() => expect(mocks.commitImport).toHaveBeenCalledWith('employeeCode,name', 'server-hash'));
    expect(await screen.findByText(/1 employees were added/i)).toBeInTheDocument();
  });

  it('keeps the newest CSV when an older file read finishes later', async () => {
    let finishSlowRead!: (value: string) => void;
    const slowRead = new Promise<string>((resolve) => { finishSlowRead = resolve; });
    let finishLatestRead!: (value: string) => void;
    const latestRead = new Promise<string>((resolve) => { finishLatestRead = resolve; });
    mocks.previewImport.mockResolvedValue(validPreview);
    const input = renderWorkflow();

    fireEvent.change(input, { target: { files: [csvFile('older.csv', () => slowRead)] } });
    fireEvent.change(input, { target: { files: [csvFile('latest.csv', () => latestRead)] } });
    expect(screen.queryByText(/is ready to validate/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate and preview/i })).toBeDisabled();
    await act(async () => { finishLatestRead('latest-content'); });
    expect(await screen.findByText(/latest.csv is ready to validate/i)).toBeInTheDocument();
    await act(async () => { finishSlowRead('older-content'); });
    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));

    await waitFor(() => expect(mocks.previewImport).toHaveBeenCalledWith('latest-content'));
  });

  it('shows actionable header errors and blocks import until a corrected file is reviewed', async () => {
    mocks.previewImport.mockResolvedValue({
      ...validPreview,
      valid: false,
      totalRows: 0,
      preview: [],
      errors: [
        { row: 1, field: 'header', message: 'Missing required column "employeeCode".' },
        { row: 1, field: 'header', message: 'Missing required column "email".' },
      ],
      errorCount: 2,
    });
    const input = renderWorkflow();
    fireEvent.change(input, { target: { files: [csvFile('missing-fields.csv', () => Promise.resolve('fullName'))] } });
    await screen.findByText(/missing-fields.csv is ready to validate/i);
    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));

    expect(await screen.findByText('Missing required column "employeeCode".')).toBeInTheDocument();
    expect(screen.getByText('Missing required column "email".')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm and import/i })).toBeDisabled();
    expect(mocks.commitImport).not.toHaveBeenCalled();
  });

  it('explains salary-pending drafts and confirms the reviewed source file without inventing pay', async () => {
    const draftCsv = 'id,fullName,email,country,department,jobTitle,employmentType,hireDate,currency\nACME-001,Ada Lovelace,ada@acme.test,BR,Engineering,Intern,INTERN,2020-01-02,BRL';
    mocks.previewImport.mockResolvedValue({
      ...validPreview,
      salaryPendingCount: 1,
      preview: [{ ...validPreview.preview[0], salary: null, currency: 'BRL', employmentType: 'INTERN' }],
    });
    mocks.commitImport.mockResolvedValue({ imported: 1 });
    const input = renderWorkflow();
    fireEvent.change(input, { target: { files: [csvFile('drafts.csv', () => Promise.resolve(draftCsv))] } });
    await screen.findByText(/drafts.csv is ready to validate/i);
    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));

    expect(await screen.findByText('Salary pending (BRL)')).toBeInTheDocument();
    expect(screen.getByText(/1 employee will be saved with salary pending/i)).toBeInTheDocument();
    expect(screen.getByText(/excluded from pay statistics until a salary is added/i)).toBeInTheDocument();
    expect(mocks.commitImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /confirm and import 1 employee/i }));
    await waitFor(() => expect(mocks.commitImport).toHaveBeenCalledWith(draftCsv, 'server-hash'));
    expect(await screen.findByText(/1 employees were added/i)).toBeInTheDocument();
  });

  it('locks file selection while preview validation is running', async () => {
    let finishPreview!: (value: typeof validPreview) => void;
    mocks.previewImport.mockReturnValue(new Promise((resolve) => { finishPreview = resolve; }));
    const input = renderWorkflow();
    fireEvent.change(input, { target: { files: [csvFile('people.csv', () => Promise.resolve('employeeCode,name'))] } });
    await screen.findByText(/people.csv is ready to validate/i);

    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));

    await waitFor(() => expect(input).toBeDisabled());
    finishPreview(validPreview);
    await screen.findByText(/ready to import/i);
    expect(input).not.toBeDisabled();
  });

  it('invalidates a reviewed preview when a different file is selected', async () => {
    mocks.previewImport
      .mockResolvedValueOnce(validPreview)
      .mockResolvedValueOnce({ ...validPreview, previewHash: 'latest-hash' });
    mocks.commitImport.mockResolvedValue({ imported: 1 });
    const input = renderWorkflow();

    fireEvent.change(input, { target: { files: [csvFile('first.csv', () => Promise.resolve('first-content'))] } });
    await screen.findByText(/first.csv is ready to validate/i);
    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));
    expect(await screen.findByRole('button', { name: /confirm and import 1 employee/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [csvFile('latest.csv', () => Promise.resolve('latest-content'))] } });
    expect(screen.queryByRole('button', { name: /confirm and import/i })).not.toBeInTheDocument();
    await screen.findByText(/latest.csv is ready to validate/i);
    expect(screen.queryByRole('button', { name: /confirm and import/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /validate and preview/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm and import 1 employee/i }));

    await waitFor(() => expect(mocks.commitImport).toHaveBeenCalledWith('latest-content', 'latest-hash'));
  });
});
