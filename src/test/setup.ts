import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { vi } from 'vitest';
vi.stubEnv('VITE_DEMO_MODE', 'true');

afterEach(cleanup);
