// src/cli/index.ts
import { Command }     from 'commander';
import { generateCmd } from '../internal/commands/generate.js';

const program = new Command();

program
  .name('orbitus')
  .description('Generate Directus GraphQL schemas, types & models')
  .version('1.0.0');

program
  .command('generate')
  .description('Run code generation (schema.json, schema.graphql, types.ts, generated.ts, model-bases.ts)')
  .action(generateCmd);

program.parse(process.argv);
