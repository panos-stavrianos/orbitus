// OrbitusConfig passed by users in directus.config.ts
export interface OrbitusConfig {
    apiUrl: string;                  // e.g. "https://api.myproject.com"
    adminToken?: string;                 // optional system token
    output?: string;                 // where to emit generated files
    modelsPath: string;
    cachePolicy?: CachePolicy; // default cache policy for Apollo Client
    maxIdleMs?: number;               // max idle time for clients in pool
    sweepEveryMs?: number;            // how often to sweep idle clients
    documents?: string | string[];           // glob pattern for GraphQL documents
    collections?: Record<string, string>;// map of collection→ModelName
}

export type CachePolicy =
    'no-cache' |
    'cache-first' |
    'cache-only' |
    'network-only' |
    'standby' |
    'cache-and-network';

// Export this for users to type their directus.config.ts
