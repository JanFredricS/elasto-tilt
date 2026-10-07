import { afterEach } from 'vitest';

// The campaign replays are long synchronous Rapier runs. The vitest runner
// does not yield to the event loop between tests, so a worker thread can
// stay blocked for over a minute on a slow CI runner; the worker's pending
// "onTaskUpdate" RPC then times out (60 s) before its queued reply is read,
// failing a run whose tests all passed. Draining the loop after every test
// keeps each pending reply younger than one test.
afterEach(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
