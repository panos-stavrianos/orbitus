// DirectusConfig passed by users in directus.config.ts
export interface DirectusConfig {
    apiUrl: string;                  // e.g. "https://api.myproject.com"
    adminToken?: string;                 // optional system token
    output?: string;                 // where to emit generated files
    modelsPath: string;
    documents?: string;           // glob pattern for GraphQL documents
    collections?: Record<string, string>;// map of collection→ModelName
}

// Export this for users to type their directus.config.ts
