import {env} from "$env/dynamic/public";
import {createClientPool} from 'orbitus'

const client = createClientPool({
    directusUrl: env.PUBLIC_DIRECTUS_URL,
}, {
    cachePolicy: %cachePolicy%,
    maxIdleMs: %maxIdleMs%,
    sweepEveryMs: %sweepEveryMs%
})

export default client