import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import { uploadSignedImage } from '../src/storage';
import DesignerIdpsPage from '../src/pages/DesignerIdpsPage';

vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() } }));
vi.mock('../src/storage', () => ({ uploadSignedImage: vi.fn() }));

const project = (id, status = 'current') => ({ id, name: `Room ${id}`, description: 'Saved description', propertyType: 'Apartment', designStyle: 'Modern', status, completionDate: '2026-09-01', images: [], imageCount: 0 });
let items;
let requests;
function list(path) {
  const url = new URL(path, 'http://test');
  const page = Number(url.searchParams.get('page') || 1);
  requests.push(url);
  return { projects: items.slice((page - 1) * 9, page * 9), pagination: { page, pageSize: 9, total: items.length, totalPages: Math.ceil(items.length / 9) } };
}
function mount(status = 'current') {
  return render(<MemoryRouter><DesignerIdpsPage status={status} /></MemoryRouter>);
}
async function edit(user, name = 'Room 1') {
  await screen.findByRole('heading', { name });
  await user.click(screen.getByRole('button', { name: `Add photos to ${name}` }));
  await screen.findByRole('heading', { name: 'Edit project' });
}

beforeEach(() => {
  vi.resetAllMocks();
  items = [project(1)];
  requests = [];
  api.get.mockImplementation(async (path) => {
    const id = path.match(/idps\/(\d+)/)?.[1];
    return id ? { project: items.find((item) => item.id === Number(id)) } : list(path);
  });
});

test('a rejected edit keeps every draft and focuses the server field error', async () => {
  const user = userEvent.setup();
  api.put.mockRejectedValueOnce(Object.assign(new Error('Check the project details.'), { errors: { designStyle: 'Use 80 characters or less.' } }));
  mount();
  await edit(user);
  await user.clear(screen.getByRole('textbox', { name: 'Project name', exact: true }));
  await user.type(screen.getByRole('textbox', { name: 'Project name', exact: true }), 'My draft name');
  await user.clear(screen.getByLabelText('Description'));
  await user.type(screen.getByLabelText('Description'), 'My draft description');
  // A server response still needs handling when browser bounds are bypassed.
  fireEvent.change(screen.getByLabelText('Design style'), { target: { value: 'x'.repeat(81) } });
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await screen.findByText('Use 80 characters or less.');
  expect(screen.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue('My draft name');
  expect(screen.getByLabelText('Description')).toHaveValue('My draft description');
  expect(screen.getByLabelText('Design style')).toHaveValue('x'.repeat(81));
  expect(screen.getByLabelText('Design style')).toHaveAttribute('aria-invalid', 'true');
  await waitFor(() => expect(screen.getByLabelText('Design style')).toHaveFocus());
  expect(screen.queryByText('Project saved.')).not.toBeInTheDocument();
});

test('a past project can change its completion date without sending the creation date', async () => {
  const user = userEvent.setup();
  items = [{ ...project(1, 'past'), createdAt: '2026-01-01T00:00:00.000Z' }];
  api.put.mockImplementation(async (_path, values) => {
    items[0] = { ...items[0], ...values };
    return { project: items[0] };
  });
  mount('past');
  await edit(user);
  const completionDate = screen.getByLabelText(/Completion date/);
  expect(completionDate).toBeEnabled();
  expect(screen.queryByLabelText(/creation date|created at/i)).not.toBeInTheDocument();
  fireEvent.change(completionDate, { target: { value: '2026-10-14' } });
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await screen.findByText('Project saved.');
  expect(api.put.mock.calls[0][0]).toBe('/designer/past-idps/1');
  expect(api.put.mock.calls[0][1]).toMatchObject({ completionDate: '2026-10-14' });
  expect(api.put.mock.calls[0][1]).not.toHaveProperty('createdAt');
  expect(items[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
});

test('search and sort start at page one, and numbered pages mark the current page', async () => {
  const user = userEvent.setup();
  items = Array.from({ length: 19 }, (_, index) => project(index + 1));
  mount();
  await user.click(await screen.findByRole('button', { name: 'Page 3', exact: true }));
  await screen.findByRole('heading', { name: 'Room 19' });
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  expect(screen.getByRole('button', { name: 'Page 3', exact: true })).toHaveAttribute('aria-current', 'page');
  await user.selectOptions(screen.getByLabelText('Sort by'), 'name-desc');
  await screen.findByRole('heading', { name: 'Room 1' });
  expect(requests.at(-1).searchParams.get('page')).toBe('1');
  expect(requests.at(-1).searchParams.get('sort')).toBe('name-desc');
  await user.click(screen.getByRole('button', { name: 'Page 2', exact: true }));
  await screen.findByRole('heading', { name: 'Room 10' });
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Room');
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByRole('heading', { name: 'Room 1' });
  expect(requests.at(-1).searchParams.get('page')).toBe('1');
  expect(requests.at(-1).searchParams.get('q')).toBe('Room');
  expect(requests.at(-1).searchParams.get('sort')).toBe('name-desc');
});

test('a list failure hides old cards and retries the same search, sort and page', async () => {
  const user = userEvent.setup();
  items = Array.from({ length: 18 }, (_, index) => project(index + 1));
  mount();
  await screen.findByRole('heading', { name: 'Room 1' });
  await user.selectOptions(screen.getByLabelText('Sort by'), 'newest');
  await screen.findByRole('heading', { name: 'Room 1' });
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Room');
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByRole('heading', { name: 'Room 1' });
  api.get.mockRejectedValueOnce(new Error('Connection lost.'));
  await user.click(screen.getByRole('button', { name: 'Page 2', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Room 1' })).not.toBeInTheDocument();
  expect(screen.queryByText('No projects yet.')).not.toBeInTheDocument();
  expect(screen.queryByText('No projects match your search.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Room 10' });
  expect(screen.queryByText('Connection lost.')).not.toBeInTheDocument();
  expect(requests.at(-1).searchParams.get('page')).toBe('2');
  expect(requests.at(-1).searchParams.get('q')).toBe('Room');
  expect(requests.at(-1).searchParams.get('sort')).toBe('newest');
});

test('an empty collection differs from a search with no matches', async () => {
  const user = userEvent.setup();
  items = [];
  mount();
  await screen.findByText('No projects yet.');
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'missing');
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByText('No projects match your search.');
  expect(screen.queryByText('No projects yet.')).not.toBeInTheDocument();
});

test('deleting the last item on the last page moves back without losing filters', async () => {
  const user = userEvent.setup();
  items = Array.from({ length: 10 }, (_, index) => project(index + 1));
  api.del.mockImplementation(async () => { items.pop(); return {}; });
  mount();
  await screen.findByRole('heading', { name: 'Room 1' });
  await user.selectOptions(screen.getByLabelText('Sort by'), 'name-asc');
  await screen.findByRole('heading', { name: 'Room 1' });
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Room');
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByRole('heading', { name: 'Room 1' });
  await user.click(screen.getByRole('button', { name: 'Page 2', exact: true }));
  await screen.findByRole('heading', { name: 'Room 10' });
  await user.click(screen.getByLabelText('More actions for Room 10'));
  await user.click(await screen.findByRole('menuitem', { name: 'Delete project', exact: true }));
  const dialog = await screen.findByRole('dialog', { name: 'Delete project?' });
  await user.click(within(dialog).getByRole('button', { name: 'Delete project', exact: true }));
  await screen.findByRole('heading', { name: 'Room 1' });
  expect(screen.getByText('Showing 1–9 of 9 projects')).toBeInTheDocument();
  expect(requests.at(-1).searchParams.get('q')).toBe('Room');
  expect(requests.at(-1).searchParams.get('sort')).toBe('name-asc');
});

test('an older response cannot replace the selected sort results', async () => {
  const user = userEvent.setup();
  let resolveOld;
  api.get.mockImplementationOnce((_path, { signal }) => new Promise((resolve) => { resolveOld = { resolve, signal }; }));
  mount();
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  await user.selectOptions(screen.getByLabelText('Sort by'), 'newest');
  await screen.findByRole('heading', { name: 'Room 1' });
  expect(resolveOld.signal.aborted).toBe(true);
  await act(async () => resolveOld.resolve({ projects: [project(99)], pagination: { page: 1, total: 1, totalPages: 1, pageSize: 9 } }));
  expect(screen.queryByRole('heading', { name: 'Room 99' })).not.toBeInTheDocument();
});

test('a partial upload keeps draft fields and retries only the remaining file', async () => {
  const user = userEvent.setup();
  const saved = { ...project(20), name: 'Server copy' };
  const savedImages = [];
  api.get.mockImplementation(async (path) => path.includes('/20') ? { project: { ...saved, images: savedImages } } : list(path));
  api.post.mockImplementation(async (path, body) => {
    if (path.endsWith('current-idps')) return { project: saved };
    if (path.endsWith('upload-url')) return { upload: { id: body.fileName } };
    if (path.includes('/complete')) {
      savedImages.push({ id: savedImages.length + 1, url: '/photo.png', fileName: path.includes('first') ? 'first.png' : 'second.png', altText: 'Room', sizeBytes: 5 });
      return {};
    }
    throw new Error('Unexpected write');
  });
  api.put.mockResolvedValue({ project: saved });
  api.del.mockResolvedValue({ cancelled: true });
  uploadSignedImage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Upload interrupted.')).mockResolvedValue(undefined);
  mount();
  await user.click(screen.getByRole('button', { name: 'Add project' }));
  await user.type(screen.getByRole('textbox', { name: 'Project name', exact: true }), 'My new room');
  await user.type(screen.getByLabelText('Description'), 'Keep this draft');
  await user.upload(screen.getByLabelText('Add images'), [new File(['first'], 'first.png', { type: 'image/png' }), new File(['second'], 'second.png', { type: 'image/png' })]);
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await screen.findByText('Upload interrupted.');
  expect(screen.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue('My new room');
  expect(screen.getByLabelText('Description')).toHaveValue('Keep this draft');
  const pending = screen.getByRole('group', { name: 'Images to upload (1)' });
  expect(within(pending).getByText('second.png')).toBeInTheDocument();
  expect(within(pending).queryByText('first.png')).not.toBeInTheDocument();
  expect(screen.queryByText('Project saved.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await screen.findByText('Project saved.');
  expect(uploadSignedImage.mock.calls.map(([, file]) => file.name)).toEqual(['first.png', 'second.png', 'second.png']);
  expect(api.post.mock.calls.filter(([path]) => path.endsWith('current-idps'))).toHaveLength(1);
});
