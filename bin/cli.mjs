#!/usr/bin/env node

import { run } from '../src/setup.mjs';

run().catch((err) => {
  console.error('\nUnexpected error:', err.message || err);
  process.exit(1);
});
