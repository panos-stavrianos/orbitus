// src/internal/commands/generate.ts

import fs from 'fs'
import path from 'path'
import {pathToFileURL} from 'url'
import {loadSchema, loadDocuments} from '@graphql-tools/load'
import {UrlLoader} from '@graphql-tools/url-loader'
import {GraphQLFileLoader} from '@graphql-tools/graphql-file-loader'
import {printSchema, parse} from 'graphql'
import {codegen} from '@graphql-codegen/core'
import type {CodegenPlugin} from '@graphql-codegen/plugin-helpers'

import * as tsPlugin from '@graphql-codegen/typescript';
import * as opsPlugin from '@graphql-codegen/typescript-operations';
import * as introPlugin from '@graphql-codegen/introspection';
import * as astPlugin from '@graphql-codegen/schema-ast';
import * as svelteNs from 'graphql-codegen-svelte-apollo';


/**
 * CLI entrypoint: loads your `directus.config.js` file,
 * fetches schemas & docs, and emits all codegen outputs.
 */
export async function generateCmd(): Promise<void> {
    const cfgPath = path.resolve(process.cwd(), 'directus.config.js')
    const cfgUrl = pathToFileURL(cfgPath).href
    const {default: cfg} = await import(cfgUrl) as {
        default: {
            apiUrl: string;
            adminToken?: string;
            output?: string;
            modelsPath: string;
            documents?: string | string[];
            collections?: Record<string, string>;
        }
    }

    // prepare output folder
    const outDir = cfg.output ?? 'src/lib/graphql';
    if (fs.existsSync(outDir)) fs.rmSync(outDir, {recursive: true, force: true});
    fs.mkdirSync(outDir, {recursive: true});

    // load GraphQL schema (public & system)
    const schema = await loadSchema(
        [
            {[`${cfg.apiUrl}/graphql`]: {headers: {Authorization: `Bearer ${cfg.adminToken || ''}`}}},
            {[`${cfg.apiUrl}/graphql/system`]: {headers: {Authorization: `Bearer ${cfg.adminToken || ''}`}}}
        ],
        {loaders: [new UrlLoader()]}
    );

    // load documents if provided
    const docs = cfg.documents
        ? await loadDocuments(
            Array.isArray(cfg.documents) ? cfg.documents : [cfg.documents],
            {loaders: [new GraphQLFileLoader()]}
        )
        : [];

    const write = (filename: string, content: string) => {
        fs.writeFileSync(path.join(outDir, filename), content, 'utf8');
    };

    // 1) schema.json (introspection)
    write(
        'schema.json',
        await codegen({
            schema: parse(printSchema(schema)),
            documents: [],
            filename: 'schema.json',
            plugins: [{introspection: {}}],
            pluginMap: {introspection: introPlugin},
            config: {}
        })
    );

    // 2) schema.graphql (AST)
    write(
        'schema.graphql',
        await codegen({
            schema: parse(printSchema(schema)),
            documents: [],
            filename: 'schema.graphql',
            plugins: [{'schema-ast': {includeDirectives: true}}],
            pluginMap: {'schema-ast': astPlugin},
            config: {}
        })
    );

    // shared base for types & operations
    const baseOpts = {
        schema: parse(printSchema(schema)),
        documents: docs,
        config: {}
    };


    // 4) generated.ts (Svelte Apollo)
    const saPlugin: CodegenPlugin = {plugin: (svelteNs as any).plugin};
    write(
        'generated.ts',
        await codegen({
            ...baseOpts,
            filename: 'generated.ts',
            plugins: [
                {typescript: {}},
                ...(docs.length ? [{'typescript-operations': {}}] : []),
                {'graphql-codegen-svelte-apollo': {clientPath: './client', asyncQuery: true}}
            ],
            pluginMap: {
                typescript: tsPlugin,
                'typescript-operations': opsPlugin,
                'graphql-codegen-svelte-apollo': saPlugin
            }
        })
    );

    // 5) model-bases.ts (custom Directus plugin)
    // resolve inside the linked package, set external to orbitus
    const pluginPath = require.resolve(
        'orbitus/core/plugins/directus-model.js',
    );
    const {plugin: modelPlugin} = require(pluginPath) as { plugin: CodegenPlugin['plugin'] };
    const dmPlugin: CodegenPlugin = {plugin: modelPlugin};

    write(
        'model-bases.ts',
        await codegen({
            ...baseOpts,
            filename: 'model-bases.ts',
            plugins: [{'directus-model': {}}],
            pluginMap: {'directus-model': dmPlugin},
            pluginContext: {
                collections: cfg.collections ?? {},
                modelsPath: cfg.modelsPath
            }
        })
    );


    // copy templates/client.ts to outDir
    const clientTemplatePath = path.resolve(
        __dirname,
        '../../templates/client.ts'
    );
    const clientTemplateContent = fs.readFileSync(clientTemplatePath, 'utf8');
    const clientOutputPath = path.join(outDir, 'client.ts');
    fs.writeFileSync(clientOutputPath, clientTemplateContent, 'utf8');


    console.log('✔  schema.json, schema.graphql, types.ts, generated.ts & model-bases.ts generated in', outDir);
}
