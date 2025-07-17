import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core/index.js'
import { ApolloLink } from '@apollo/client/core/index.js'
import { InMemoryCache } from '@apollo/client/cache/cache.cjs'
import { HttpLink }      from '@apollo/client/link/http/http.cjs'
import { setContext } from '@apollo/client/link/context/context.cjs'

interface CreateClientOptions {
    directusUrl: string
}

export function createClient(
    options: CreateClientOptions
): ApolloClient<NormalizedCacheObject> {
    const { directusUrl } = options
    if (!directusUrl) throw new Error('Missing Directus URL')

    const defaultEndpoint = new HttpLink({ uri: `${directusUrl}/graphql` })
    const systemEndpoint = new HttpLink({ uri: `${directusUrl}/graphql/system` })

    const authLink = setContext((_, context) => {
        // Expect token to be passed in context per operation
        const { token } = context
        if (!token) return context
        return {
            headers: {
                ...context.headers,
                authorization: `Bearer ${token}`,
            },
        }
    })

    const httpLink = ApolloLink.split(
        (operation) => operation.getContext().system,
        systemEndpoint,
        defaultEndpoint
    )

    const httpLinkWithAuth = authLink.concat(httpLink)

    return new ApolloClient({
        link: httpLinkWithAuth,
        cache: new InMemoryCache(),
    })
}
