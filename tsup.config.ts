// tsup.config.ts
import {defineConfig} from 'tsup'
import {builtinModules} from 'module'

export default defineConfig([
    /* ── CLI ───────────────────────────────────────────────────── */
    {
        entry: ['src/cli/index.ts'],
        outDir: 'dist/cli',
        format: ['cjs'],
        target: 'node18',
        clean: true,               // remove old files
        dts: false,
        splitting: false,
        banner: {
            js: '#!/usr/bin/env node\nrequire("ts-node/register");'
        },
        external: [
            ...builtinModules,
            'ts-node/register',
            'commander',
            '@graphql-tools/*',
            '@graphql-codegen/*',
            'graphql-codegen-svelte-apollo',
            'orbitus/core/plugins/directus-model.js'
        ],
        outExtension: () => ({
            js: '.js',
        }),
    },

    /* ── Core + plugin (ESM + CJS) ─────────────────────────────── */
    {
        entry: {
            index: 'src/core/index.ts',
            'plugins/directus-model': 'src/plugins/directus-model.ts',
        },
        outDir: 'dist/core',
        format: ['esm', 'cjs'],
        target: 'node18',
        clean: true,               // ensure fresh build
        dts: true,
        splitting: false,
        external: [...builtinModules],
        outExtension: ({format}) => ({
            js: format === 'esm' ? '.mjs' : '.js',
            dts: format === 'esm' ? '.d.mts' : '.d.ts',
        }),
    }
])

