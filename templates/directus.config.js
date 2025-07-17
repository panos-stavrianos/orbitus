import { /** @type {import('./types').DirectusConfig} */ DirectusConfig } from './types.js';

/** @type {DirectusConfig} */
const config = {
    apiUrl: "https://example",
    adminToken: "",
    output: "src/lib/graphql",
    modelsPath: '$lib/models',
    documents: 'src/**/*.gql',
    collections: {

    }
};

export default config;
