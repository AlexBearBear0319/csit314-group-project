// Tests for the validateInput() step of our boundary pages.
// The Boundary checks the form BEFORE it calls the server. For every page below
// we send bad input and check two things:
//   1. the page shows the message under the right box
//   2. the page did NOT call the server (api.post stays untouched)
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { api } from '../src/api';
import CreateCompanyPg from '../src/boundary/CreateCompanyPg';
import CreateUserProfilePg from '../src/boundary/CreateUserProfilePg';
import CreateIDPCategoryPg from '../src/boundary/CreateIDPCategoryPg';
import CreateUserAccountPg from '../src/boundary/CreateUserAccountPg';

vi.mock('../src/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// The browser also blocks some bad input itself (a "required" box, an email box).
// We submit the form directly so these tests reach OUR validateInput() step.
const submit = (buttonName) => fireEvent.submit(screen.getByRole('button', { name: buttonName }).closest('form'));

test('#13 create company: an empty name is refused before the server is called', async () => {
  wrap(<CreateCompanyPg />);
  submit('Create company');
  expect(await screen.findByText('Enter a company name.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('#13 create company: a valid form is sent to the server', async () => {
  api.post.mockResolvedValueOnce({ id: 1 });
  wrap(<CreateCompanyPg />);
  await userEvent.type(screen.getByLabelText(/Company name/), 'Studio One');
  await userEvent.click(screen.getByRole('button', { name: 'Create company' }));
  expect(api.post).toHaveBeenCalledWith('/companies', { name: 'Studio One', description: '' });
});

test('#1 create user profile: an empty name is refused before the server is called', async () => {
  wrap(<CreateUserProfilePg />);
  submit('Create profile');
  expect(await screen.findByText('Enter a profile name.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('#39 create IDP category: an empty name is refused before the server is called', async () => {
  wrap(<CreateIDPCategoryPg />);
  submit('Create category');
  expect(await screen.findByText('Enter a category name.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('#6 create user account: bad email and a short password are refused before the server is called', async () => {
  api.get.mockResolvedValueOnce([{ id: 3, name: 'Customer' }]); // the profile dropdown
  wrap(<CreateUserAccountPg />);
  await screen.findByLabelText(/User profile/);
  await userEvent.type(screen.getByLabelText(/User ID/), 'new.user');
  await userEvent.type(screen.getByLabelText(/Password/), 'short');
  await userEvent.type(screen.getByLabelText(/Name/), 'New User');
  await userEvent.type(screen.getByLabelText(/Email/), 'not-an-email');
  submit('Create account');
  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  expect(screen.getByText(/Use at least 12 characters/, { selector: '[role="alert"]' })).toBeInTheDocument();
  expect(screen.getByText('Choose a user profile.')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
