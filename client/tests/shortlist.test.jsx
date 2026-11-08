// =============================================================================
// TESTS: shortlist.test.jsx
// The three Customer shortlist stories:
//   Save   - "save an IDP to my shortlist so that I can refer back to it later"
//   View   - "view my shortlist so that I can see all the IDPs I have saved"
//   Search - "search my shortlist so that I can quickly find a specific saved IDP"
//
// The pages are drawn for real, but the backend is fake, so no account or
// database is needed. Run from the client folder with: npm test
// =============================================================================

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import ViewShortlistPg from '../src/boundary/ViewShortlistPg';
import SaveShortlistPg from '../src/boundary/SaveShortlistPg';

vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

// One saved project, the way the backend sends it in the list.
const SAVED = { id: 7, name: 'Warm Kitchen', propertyType: 'Condo', designStyle: 'Modern', status: 'current', designerName: 'Dana Designer' };

// Draw My Shortlist, with a stand-in for the Search IDPs page it links to.
function mountShortlist() {
  return render(
    <MemoryRouter initialEntries={['/customer/shortlist']}>
      <Routes>
        <Route path="/customer/shortlist" element={<ViewShortlistPg />} />
        <Route path="/customer/search" element={<h1>Search IDPs</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => { vi.resetAllMocks(); });

// ---- View my shortlist ------------------------------------------------------

test('View: opens with everything the Customer saved', async () => {
  api.get.mockResolvedValue([SAVED]);
  mountShortlist();
  expect(await screen.findByRole('cell', { name: 'Warm Kitchen' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Condo' })).toBeInTheDocument();
  expect(api.get.mock.calls[0][0]).toBe('/customer/shortlist');
});

test('View: says so when nothing is saved', async () => {
  api.get.mockResolvedValue([]);
  mountShortlist();
  expect(await screen.findByText('No results found.')).toBeInTheDocument();
});

test('View: shows the error when the list cannot load', async () => {
  api.get.mockRejectedValue(new Error('Unable to load your shortlist.'));
  mountShortlist();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your shortlist.');
});

test('View: the View button opens the project in a pop-up', async () => {
  api.get.mockImplementation(async (path) => (path === '/customer/shortlist'
    ? [SAVED]
    : { ...SAVED, description: 'A bright room', categoryName: 'Residential', companyName: 'Dana Studio', images: [] }));
  const user = userEvent.setup();
  mountShortlist();
  await user.click(await screen.findByRole('button', { name: 'View' }));
  const dialog = await screen.findByRole('dialog', { name: 'Warm Kitchen' });
  expect(await within(dialog).findByText('A bright room')).toBeVisible();
  expect(within(dialog).getByText('Dana Designer')).toBeVisible();
  expect(api.get).toHaveBeenCalledWith('/customer/shortlist/7');
  await user.click(within(dialog).getByRole('button', { name: 'Close project view' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('View: the pop-up shows the error if the project cannot load', async () => {
  api.get.mockImplementation(async (path) => {
    if (path === '/customer/shortlist') return [SAVED];
    throw new Error('This project is not in your shortlist.');
  });
  const user = userEvent.setup();
  mountShortlist();
  await user.click(await screen.findByRole('button', { name: 'View' }));
  const dialog = await screen.findByRole('dialog', { name: 'Warm Kitchen' });
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('This project is not in your shortlist.');
});

test('View: Find projects to save goes to Search IDPs', async () => {
  api.get.mockResolvedValue([SAVED]);
  const user = userEvent.setup();
  mountShortlist();
  await user.click(await screen.findByRole('button', { name: 'Find projects to save' }));
  expect(await screen.findByRole('heading', { name: 'Search IDPs' })).toBeInTheDocument();
});

// ---- Search my shortlist ----------------------------------------------------

test('Search: sends the typed keyword and shows the matches', async () => {
  api.get.mockResolvedValueOnce([SAVED, { ...SAVED, id: 8, name: 'Calm Bedroom' }]).mockResolvedValue([SAVED]);
  const user = userEvent.setup();
  mountShortlist();
  await screen.findByRole('cell', { name: 'Calm Bedroom' });
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'kitchen');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(screen.queryByRole('cell', { name: 'Calm Bedroom' })).not.toBeInTheDocument());
  expect(api.get.mock.calls.at(-1)[0]).toBe('/customer/shortlist?keyword=kitchen');
});

test('Search: Clear search empties the box and shows everything again', async () => {
  api.get.mockResolvedValue([SAVED]);
  const user = userEvent.setup();
  mountShortlist();
  await screen.findByRole('cell', { name: 'Warm Kitchen' });
  expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'kitchen');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await user.click(await screen.findByRole('button', { name: 'Clear search' }));
  await waitFor(() => expect(api.get.mock.calls.at(-1)[0]).toBe('/customer/shortlist?keyword='));
  expect(await screen.findByRole('textbox', { name: 'Search' })).toHaveValue('');
});

// ---- Save to shortlist ------------------------------------------------------

test('Save: sends only the project ID, tells the Customer, and reports back', async () => {
  api.post.mockResolvedValue(SAVED);
  const onSaved = vi.fn();
  const user = userEvent.setup();
  render(<SaveShortlistPg project={SAVED} saved={false} onSaved={onSaved} />);
  await user.click(screen.getByRole('button', { name: 'Save Warm Kitchen to shortlist' }));
  expect(api.post).toHaveBeenCalledWith('/customer/shortlist', { projectId: 7 });
  expect(await screen.findByText('Warm Kitchen was saved to your shortlist.')).toBeInTheDocument();
  expect(onSaved).toHaveBeenCalledWith(7);
});

test('Save: a project that is already saved cannot be saved again', () => {
  render(<SaveShortlistPg project={SAVED} saved onSaved={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Warm Kitchen is saved to your shortlist' })).toBeDisabled();
});

test('Save: if another tab saved it first, shows the message and marks it saved', async () => {
  api.post.mockRejectedValue(Object.assign(new Error('This project is already in your shortlist.'), { status: 409 }));
  const onSaved = vi.fn();
  const user = userEvent.setup();
  render(<SaveShortlistPg project={SAVED} saved={false} onSaved={onSaved} />);
  await user.click(screen.getByRole('button', { name: 'Save Warm Kitchen to shortlist' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This project is already in your shortlist.');
  expect(onSaved).toHaveBeenCalledWith(7);
});

test('Save: any other failure shows the error and does not mark it saved', async () => {
  api.post.mockRejectedValue(Object.assign(new Error('This project is not available.'), { status: 404 }));
  const onSaved = vi.fn();
  const user = userEvent.setup();
  render(<SaveShortlistPg project={SAVED} saved={false} onSaved={onSaved} />);
  await user.click(screen.getByRole('button', { name: 'Save Warm Kitchen to shortlist' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This project is not available.');
  expect(onSaved).not.toHaveBeenCalled();
});
