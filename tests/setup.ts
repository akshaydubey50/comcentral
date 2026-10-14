import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Bind DOM matchers to the active Vitest instance in every worker.
expect.extend(matchers);
afterEach(() => { if (typeof document !== 'undefined') cleanup(); });
