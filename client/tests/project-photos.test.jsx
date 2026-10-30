import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import ProjectImageCarousel from '../src/components/ProjectImageCarousel';
import ProjectFolderCard from '../src/components/ProjectFolderCard';
import ProjectPreviewDialog from '../src/components/ProjectPreviewDialog';
import RecentProjectCard from '../src/components/RecentProjectCard';
import DesignerDashboard from '../src/pages/DesignerDashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../src/components/StudioMotion', () => ({ default: () => <div /> }));
const photo = (url = '/expired.png') => ({ id: 7, fileName: 'room.png', altText: 'Living room', url });
const project = (url = '/expired.png') => ({ id: 2, status: 'past', name: 'Calm home', images: [photo(url)], imageCount: 1 });

beforeEach(() => { vi.resetAllMocks(); });

test('an expired link is refreshed and a second failure offers a bounded user retry', async () => {
  const user = userEvent.setup();
  api.get.mockResolvedValueOnce({ project: project('/fresh.png') }).mockResolvedValueOnce({ project: project('/retry.png') });
  render(<ProjectImageCarousel projectId={2} status="past" projectName="Calm home" images={[photo()]} />);
  fireEvent.error(screen.getByAltText('Living room'));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/fresh.png'));
  expect(api.get.mock.calls[0][0]).toBe('/designer/past-idps/2');
  fireEvent.error(screen.getByAltText('Living room'));
  await screen.findByRole('button', { name: 'Retry photo' });
  expect(api.get).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Retry photo' }));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/retry.png'));
  fireEvent.load(screen.getByAltText('Living room'));
  expect(screen.queryByText('This photo is unavailable.')).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
});

test('retrying an identical URL with the same image ID resets its failed state', async () => {
  const user = userEvent.setup();
  api.get.mockResolvedValue({ project: project() });
  render(<ProjectImageCarousel projectId={2} status="past" projectName="Calm home" images={[photo()]} />);
  fireEvent.error(screen.getByAltText('Living room'));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/expired.png'));
  fireEvent.error(screen.getByAltText('Living room'));
  await user.click(await screen.findByRole('button', { name: 'Retry photo' }));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/expired.png'));
  fireEvent.load(screen.getByAltText('Living room'));
  expect(screen.queryByRole('button', { name: 'Retry photo' })).not.toBeInTheDocument();
});

test('a missing link and an offline refresh keep an explicit retry action', async () => {
  const user = userEvent.setup();
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ project: project('/fresh.png') });
  render(<ProjectImageCarousel projectId={2} status="past" projectName="Calm home" images={[photo(null)]} />);
  await screen.findByRole('button', { name: 'Retry photo' });
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  await user.click(screen.getByRole('button', { name: 'Retry photo' }));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/fresh.png'));
});

test('a successful metadata response with missing links still offers folder retry', async () => {
  api.get.mockResolvedValue({ project: project(null) });
  render(<ProjectFolderCard project={project(null)} past onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  await screen.findByRole('button', { name: 'Retry photos' });
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('a long-open viewer can recover another expired link after the cooldown', async () => {
  const time = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(time);
  api.get.mockResolvedValueOnce({ project: project('/fresh.png') }).mockResolvedValueOnce({ project: project('/later.png') });
  render(<ProjectImageCarousel projectId={2} status="past" projectName="Calm home" images={[photo()]} />);
  fireEvent.error(screen.getByAltText('Living room'));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/fresh.png'));
  clock.mockReturnValue(time + 300_001);
  fireEvent.error(screen.getByAltText('Living room'));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/later.png'));
  expect(api.get).toHaveBeenCalledTimes(2);
});

test('leaving a viewer cancels an in-flight photo refresh', async () => {
  let resolve;
  let signal;
  api.get.mockImplementation((_path, options) => { signal = options.signal; return new Promise((done) => { resolve = done; }); });
  const { unmount } = render(<ProjectImageCarousel projectId={2} status="past" projectName="Calm home" images={[photo()]} />);
  fireEvent.error(screen.getByAltText('Living room'));
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ project: project('/fresh.png') }));
});

test('folder previews refresh together and stop automatic retries on a bad object', async () => {
  const user = userEvent.setup();
  api.get.mockResolvedValue({ project: project('/fresh.png') });
  const { container } = render(<ProjectFolderCard project={project()} past onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
  fireEvent.error(container.querySelector('img'));
  await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', '/fresh.png'));
  fireEvent.error(container.querySelector('img'));
  await screen.findByRole('button', { name: 'Retry photos' });
  expect(api.get).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Retry photos' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
});

test('the dashboard thumbnail and shared detail dialog both recover private links', async () => {
  api.get.mockResolvedValue({ project: project('/fresh.png') });
  const { container, unmount } = render(<RecentProjectCard project={project()} index={0} onView={vi.fn()} />);
  fireEvent.error(container.querySelector('img'));
  await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', '/fresh.png'));
  unmount();
  render(<ProjectPreviewDialog project={project()} onClose={vi.fn()} />);
  fireEvent.error(screen.getByAltText('Living room'));
  await waitFor(() => expect(screen.getByAltText('Living room')).toHaveAttribute('src', '/fresh.png'));
  expect(api.get).toHaveBeenCalledTimes(2);
});

test('dashboard recent work explicitly requests edit-time order from both collections', async () => {
  api.get.mockImplementation(async (path) => ({ projects: [{ ...project(), status: path.includes('current') ? 'current' : 'past', updatedAt: '2026-10-30' }], pagination: { total: 1 } }));
  render(<MemoryRouter><DesignerDashboard /></MemoryRouter>);
  await screen.findAllByRole('button', { name: 'View Calm home' });
  expect(api.get.mock.calls.map(([path]) => path)).toEqual([
    '/designer/current-idps?page=1&sort=recent', '/designer/past-idps?page=1&sort=recent',
  ]);
});
