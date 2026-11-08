import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import IDPManagementPage from '../src/boundary/IDPManagementPage';

vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const project = { id: 12, name: 'Modern apartment', status: 'current', propertyType: 'Apartment', designStyle: 'Modern' };

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async path => {
    if (path.endsWith('/filters')) return { propertyTypes: ['Apartment'], designStyles: ['Modern'] };
    return { projects: [project], page: 1, total: 1, totalPages: 1, pageSize: 9 };
  });
  api.post.mockResolvedValue({ ...project, categoryName: 'Residential', designerName: 'Test Designer', companyName: 'Design Studio', images: [] });
});

function mount() {
  return render(<MemoryRouter><IDPManagementPage /></MemoryRouter>);
}

test('empty search shows the BCE prompt while initial ongoing browsing still works', async () => {
  const user = userEvent.setup();
  mount();
  await screen.findByRole('heading', { name: project.name });
  const calls = api.get.mock.calls.length;
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a keyword or choose a filter.');
  expect(api.get).toHaveBeenCalledTimes(calls);
});

test('keyword and filters are submitted together and sorting preserves them', async () => {
  const user = userEvent.setup();
  mount();
  await screen.findByRole('heading', { name: project.name });
  await user.selectOptions(screen.getByLabelText('Property type'), 'Apartment');
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Modern');
  await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
  await screen.findByRole('heading', { name: project.name });
  await user.selectOptions(screen.getByLabelText('Sort projects'), 'alphabetical');
  await waitFor(() => {
    const path = api.get.mock.calls.at(-1)[0];
    const query = new URL(path, 'http://test').searchParams;
    expect(query.get('keyword')).toBe('Modern');
    expect(query.get('propertyType')).toBe('Apartment');
    expect(query.get('sort')).toBe('alphabetical');
    expect(query.get('page')).toBe('1');
  });
});

test('opening details displays category and designer information and Close restores the list', async () => {
  const user = userEvent.setup();
  mount();
  await user.click(await screen.findByRole('button', { name: 'View project' }));
  const dialog = await screen.findByRole('dialog', { name: project.name });
  expect(await within(dialog).findByText('Residential')).toBeVisible();
  expect(within(dialog).getByText('Test Designer')).toBeVisible();
  expect(within(dialog).getByText('Design Studio')).toBeVisible();
  expect(api.post).toHaveBeenCalledWith('/customer/idps/12/view', {});
  await user.click(within(dialog).getByRole('button', { name: 'Close project view' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: project.name })).toBeVisible();
});
