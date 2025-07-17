import {env} from "$env/dynamic/public";
import {createClient} from 'orbitus'

const client = createClient({
    directusUrl: env.PUBLIC_DIRECTUS_URL,
})

export default client