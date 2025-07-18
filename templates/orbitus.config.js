/**
 * @typedef {import('orbitus').OrbitusConfig} OrbitusConfig
 */

/** @type {OrbitusConfig} */
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
