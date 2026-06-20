import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// JSDOM doesn't implement scrollIntoView; stub it for components that auto-scroll.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}

	(globalThis as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}

afterEach(() => {
	cleanup();
});
