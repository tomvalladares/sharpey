#!/usr/bin/env node

import { createProgram } from '../src/cli.js';
import { run } from '../src/index.js';
import * as logger from '../src/logger.js';

const program = createProgram();
program.action(async (inputDir, opts) => {
  try {
    await run(inputDir, opts);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
});

program.parse();
