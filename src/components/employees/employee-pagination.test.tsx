import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EmployeePagination } from './employee-pagination';

const onPageChange = vi.fn();
const onPageSizeChange = vi.fn();
type Props = Parameters<typeof EmployeePagination>[0];
function show(overrides: Partial<Props> = {}) {
  return render(<EmployeePagination pagination={{ page: 2, pageSize: 25, total: 67, totalPages: 3 }} visibleCount={25} busy={false} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} {...overrides} />);
}

describe('EmployeePagination', () => {
  beforeEach(() => { onPageChange.mockReset(); onPageSizeChange.mockReset(); });

  it('shows the actual record range and selected page', () => {
    show();
    expect(screen.getByText('26–50 of 67 employees')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows only the remaining records on a partial final page', () => {
    show({ pagination: { page: 3, pageSize: 25, total: 67, totalPages: 3 }, visibleCount: 17 });
    expect(screen.getByText('51–67 of 67 employees')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled();
  });

  it('disables all navigation for empty results without inventing a range', () => {
    show({ pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 }, visibleCount: 0 });
    expect(screen.getByText('0 matching employees')).toBeInTheDocument();
    for (const label of ['First', 'Previous', 'Next', 'Last']) expect(screen.getByRole('button', { name: label })).toBeDisabled();
  });

  it('passes a numeric page size from the labelled selector', () => {
    show();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Rows per page' }));
    fireEvent.click(screen.getByRole('option', { name: '50' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('retains a valid bookmarked page size outside the presets', () => {
    show({ pagination: { page: 1, pageSize: 30, total: 67, totalPages: 3 }, visibleCount: 30 });
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveTextContent('30');
    expect(screen.getByText('1–30 of 67 employees')).toBeInTheDocument();
  });

  it('prevents additional navigation and size changes while fetching', () => {
    show({ busy: true });
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveAttribute('aria-disabled', 'true');
  });
});
