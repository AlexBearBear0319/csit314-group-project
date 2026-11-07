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
import SaveShortlistPg from '../src/boundary/SaveShortlistPg'; // the save page being tested

// Replace the real backend helper with fake functions.
vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

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
        <Route path="/customer/shortlist/save" element={<SaveShortlistPg />} />
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

// =============================================================================
// SAVE PAGE TESTS (#34)
// =============================================================================

// Two projects, as the browse search would send them (one page of results).
const OPEN = { id: 8, name: 'Calm Bedroom', propertyType: 'HDB', designStyle: 'Scandinavian', status: 'past' };

// =============================================================================
// FUNCTION: fakeBackend (helper)
// WHAT IT DOES: makes the fake backend answer by address: the Customer's
// shortlist, or one page of browse results.
// RECEIVES: saved = the shortlist list; totalPages = how many result pages.
// =============================================================================
function fakeBackend(saved = [SAVED], totalPages = 1) {
  api.get.mockImplementation(async (path) => (path.startsWith('/customer/shortlist?')
    ? saved
    : { projects: [SAVED, OPEN], page: 1, totalPages }));
} // End of fakeBackend.

// TEST: #34. My Shortlist has a button that opens the save page.
test('opens the save page from My Shortlist', async () => {
  fakeBackend(); // the fake backend answers both lists
  const user = userEvent.setup(); // a fake user
  mount(); // draw the list page
  await user.click(await screen.findByRole('button', { name: 'Find projects to save' })); // click the button
  expect(await screen.findByRole('heading', { name: 'Save to shortlist' })).toBeInTheDocument(); // the save page opened
});

// TEST: #34. Projects already saved show Saved; the others show Save.
test('marks projects that are already saved', async () => {
  fakeBackend(); // Warm Kitchen is already saved
  mount('/customer/shortlist/save'); // open the save page
  expect(await screen.findByRole('cell', { name: 'Calm Bedroom' })).toBeInTheDocument(); // the list is shown
  await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()); // Warm Kitchen: Saved, greyed out
  expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(1); // only Calm Bedroom can be saved
  expect(api.get).toHaveBeenCalledWith('/customer/idps?keyword=&page=1'); // it used the browse search
});

// TEST: #34. Save sends the project ID, shows a message, and the row becomes Saved.
test('saves a project to the shortlist', async () => {
  fakeBackend(); // Warm Kitchen is already saved
  api.post.mockResolvedValue(OPEN); // the fake backend accepts the save
  const user = userEvent.setup(); // a fake user
  mount('/customer/shortlist/save'); // open the save page
  await screen.findByRole('cell', { name: 'Calm Bedroom' }); // wait for the list
  await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument()); // wait for the shortlist
  await user.click(screen.getByRole('button', { name: 'Save' })); // click Save on Calm Bedroom
  expect(api.post).toHaveBeenCalledWith('/customer/shortlist', { projectId: 8 }); // only the project ID is sent
  expect(await screen.findByText('Calm Bedroom was saved to your shortlist.')).toBeInTheDocument(); // the green message
  expect(screen.getAllByRole('button', { name: 'Saved' })).toHaveLength(2); // both rows now show Saved
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument(); // no Save buttons are left
});

// TEST: #34. A project that is already saved shows the backend's message.
test('shows the message when the project is already saved', async () => {
  fakeBackend([]); // the shortlist looks empty on this page (for example, saved in another tab)
  api.post.mockRejectedValue(Object.assign(new Error('This project is already in your shortlist.'), { status: 409 })); // the fake backend refuses
  const user = userEvent.setup(); // a fake user
  mount('/customer/shortlist/save'); // open the save page
  await screen.findByRole('cell', { name: 'Warm Kitchen' }); // wait for the list
  await user.click(screen.getAllByRole('button', { name: 'Save' })[0]); // click Save on Warm Kitchen
  expect(await screen.findByRole('alert')).toHaveTextContent('This project is already in your shortlist.'); // the red message
  expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled(); // the row now shows Saved
});

// TEST: #34. Next asks the backend for page 2.
test('moves to the next page of projects', async () => {
  fakeBackend([SAVED], 2); // there are 2 pages of results
  const user = userEvent.setup(); // a fake user
  mount('/customer/shortlist/save'); // open the save page
  await user.click(await screen.findByRole('button', { name: 'Next' })); // click Next
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/customer/idps?keyword=&page=2')); // page 2 was asked for
});
