import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    // Cold-start the Firestore emulator (JVM warmup + port bind) can
    // run 8-15s on slower machines before the SDK init in beforeAll.
    hookTimeout: 30_000,
    environment: 'node',
    // All test files share one emulator on a fixed port and clearFirestore()
    // in afterEach is global; parallel files would race on shared state.
    fileParallelism: false,
  },
});
