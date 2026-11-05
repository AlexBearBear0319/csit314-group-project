// =============================================================================
// TESTS: shortlist.test.jsx
// Tests for the My Shortlist pages (Customer stories #35 and #36).
// They draw the real pages in a fake browser and use a fake backend, so no
// real account or database is needed.
//
// HOW TO RUN (from the client folder):  npm test
// =============================================================================

// Tools to draw a page, find things on it, and wait for updates.
import { render, screen, waitFor } from '@testing-library/react';
// A tool that clicks and types like a real user.
import userEvent from '@testing-library/user-event';
// A fake browser address bar, and the tools to set up pages at addresses.
import { MemoryRouter, Route, Routes } from 'react-router-dom';
// The test tools: beforeEach, expect, test, and vi (makes fake functions).
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api'; // the backend helper (replaced below)
import SearchShortlistPg from '../src/boundary/SearchShortlistPg'; // the list page being tested
import ViewShortlistPg from '../src/boundary/ViewShortlistPg'; // the details page being tested

// Replace the real backend helper with fake functions.
vi.mock('../src/api', () => ({ api: { get: vi.fn() } }));

// One saved project, as the backend would send it in the list.
const SAVED = { id: 7, name: 'Warm Kitchen', propertyType: 'Condo', designStyle: 'Modern', status: 'current', designerName: 'Dana Designer' };

// =============================================================================
// FUNCTION: mount (helper)
// WHAT IT DOES: draws both pages at their real addresses, starting at one address.
// RECEIVES: address = where the fake browser starts.
// =============================================================================
function mount(address = '/customer/shortlist') {
  return render(
    <MemoryRouter initialEntries={[address]}>
      <Routes>
        <Route path="/customer/shortlist" element={<SearchShortlistPg />} />
        <Route path="/customer/shortlist/:id" element={<ViewShortlistPg />} />
      </Routes>
    </MemoryRouter>
  );
} // End of mount.

// SETUP: before each test, clear what the fake backend did last time.
beforeEach(() => {
  vi.resetAllMocks();
});

// TEST: #35. The list shows saved projects.
test('shows the saved projects in a table', async () => {
  api.get.mockResolvedValue([SAVED]); // the fake backend sends one project
  mount(); // draw the page
  expect(await screen.findByRole('cell', { name: 'Warm Kitchen' })).toBeInTheDocument(); // its name is shown
  expect(screen.getByRole('cell', { name: 'Condo' })).toBeInTheDocument(); // its property type is shown
  expect(api.get.mock.calls[0][0]).toBe('/customer/shortlist?keyword='); // it asked the right address
});

// TEST: #35. An empty shortlist shows the agreed message.
test('says so when nothing is saved', async () => {
  api.get.mockResolvedValue([]); // the fake backend sends an empty list
  mount(); // draw the page
  expect(await screen.findByText('No results found.')).toBeInTheDocument(); // the empty message
});

// TEST: #35. A search sends the typed words to the backend.
test('searches with the typed keyword', async () => {
  api.get.mockResolvedValue([SAVED]); // the fake backend sends one project
  const user = userEvent.setup(); // a fake user
  mount(); // draw the page
  await user.type(await screen.findByRole('textbox', { name: 'Search' }), 'kitchen'); // type in the box
  await user.click(screen.getByRole('button', { name: 'Search' })); // click Search
  // Wait for the page to ask the backend with the keyword.
  await waitFor(() => expect(api.get.mock.calls.at(-1)[0]).toBe('/customer/shortlist?keyword=kitchen'));
});

// TEST: #35. A failed load shows the error.
test('shows an error when the list cannot load', async () => {
  api.get.mockRejectedValue(new Error('Unable to load your shortlist.')); // the fake backend fails
  mount(); // draw the page
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your shortlist.'); // the message is shown
});

// TEST: #36. View opens the details page with the full record.
test('opens the details of a saved project', async () => {
  // The fake backend answers by address: the list, or one project.
  api.get.mockImplementation(async (path) => (path.startsWith('/customer/shortlist?')
    ? [SAVED]
    : { ...SAVED, description: 'A bright room', imageCount: 1, images: [{ id: 1, url: 'https://example.com/a.jpg', altText: 'A kitchen', fileName: 'a.jpg' }] }));
  const user = userEvent.setup(); // a fake user
  mount(); // draw the list page
  await user.click(await screen.findByRole('button', { name: 'View' })); // click View
  expect(await screen.findByRole('heading', { name: 'Warm Kitchen' })).toBeInTheDocument(); // the details page opened
  expect(screen.getByText('A bright room')).toBeInTheDocument(); // the description is shown
  expect(screen.getByText('Dana Designer')).toBeInTheDocument(); // the designer's name is shown
  expect(screen.getByRole('img', { name: 'A kitchen' })).toHaveAttribute('src', 'https://example.com/a.jpg'); // the photo is shown
});

// TEST: #36. A project that is not in the shortlist shows the backend's message.
test('shows an error for a project that is not in the shortlist', async () => {
  api.get.mockRejectedValue(new Error('This project is not in your shortlist.')); // the fake backend refuses
  mount('/customer/shortlist/99'); // open the details page directly
  expect(await screen.findByRole('alert')).toHaveTextContent('This project is not in your shortlist.'); // the message is shown
});
