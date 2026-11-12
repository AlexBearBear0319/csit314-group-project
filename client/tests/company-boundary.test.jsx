// Tests for the company pages: #14 View, #16 Delete, #17 Search.
// These pages have displaySuccess() and displayError(). They should
// behave the same as before, so these tests check the results and error messages.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import ViewCompanyPg from '../src/boundary/ViewCompanyPg';
import SearchCompanyPg from '../src/boundary/SearchCompanyPg';
import DeleteCompanyPg from '../src/boundary/DeleteCompanyPg';

vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }));
// A fake company, as the backend would send it.
const COMPANY = { name: 'Studio One', description: 'Calm homes' };
beforeEach(() => vi.resetAllMocks());
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test('#14 view page shows the company (displaySuccess) and an error (displayError)', async () => {
  api.get.mockResolvedValueOnce(COMPANY);
  wrap(<ViewCompanyPg />);
  expect(await screen.findByText('Studio One')).toBeInTheDocument();
});
test('#14 view page shows a load error', async () => {
  api.get.mockRejectedValueOnce(new Error('Company not found.'));
  wrap(<ViewCompanyPg />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Company not found.');
});
test('#17 search page lists companies and shows a load error', async () => {
  api.get.mockResolvedValueOnce([COMPANY]);
  wrap(<SearchCompanyPg />);
  expect(await screen.findByText('Studio One')).toBeInTheDocument();
});
test('#16 delete shows the server error and stays on the page', async () => {
  api.del.mockRejectedValueOnce(new Error('Company not found.'));
  wrap(<DeleteCompanyPg company={COMPANY} />);
  await userEvent.click(screen.getByRole('button', { name: 'Delete company' }));
  const buttons = screen.getAllByRole('button', { name: 'Delete company' });
  await userEvent.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Company not found.'));
});
