import {env} from "$env/dynamic/public";
import {createClientPool} from 'orbitus'

const client = createClientPool({
    directusUrl: env.PUBLIC_DIRECTUS_URL,
})

export default client