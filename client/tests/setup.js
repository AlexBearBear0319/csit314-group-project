import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);

// JSDOM has no browser media settings or object URL store. These adapters keep
// tests on the real components without requiring live files or a real account.
window.matchMedia = () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
URL.createObjectURL = () => 'blob:test-photo';
URL.revokeObjectURL = () => {};
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
