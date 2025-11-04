// src/lib/graphql/client.ts
import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    HttpLink,
    type ApolloClient as ApolloClientType
} from '@apollo/client'
import {setContext} from '@apollo/client/link/context'
import type {CachePolicy, CredentialsInCookies} from './types'

type Token = string | null | undefined

function makeClient(
    directusUrl: string,
    cachePolicy: CachePolicy,
    credentialsInCookies: CredentialsInCookies
): ApolloClient {
    const defaultLink = new HttpLink({uri: `${directusUrl}/graphql`})
    const systemLink = new HttpLink({uri: `${directusUrl}/graphql/system`})

    // v4: setContext still works; just make the header casing sane
    const authLink = setContext((_, ctx: any) => {
        const prev = (ctx && ctx.headers) || {}
        const headers = ctx?.token ? {...prev, Authorization: `Bearer ${ctx.token}`} : prev
        const credentials = ctx?.auth === 'cookies' ? credentialsInCookies : 'omit'
        return {headers, credentials}
    })

    // be explicit; truthy beats strict === true pitfalls
    const http = ApolloLink.split(
        op => Boolean((op.getContext() as any)?.system),
        systemLink,
        defaultLink
    )

    return new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([authLink, http]),
        defaultOptions: {
            query: {fetchPolicy: cachePolicy, errorPolicy: 'all'},
            watchQuery: {fetchPolicy: cachePolicy, errorPolicy: 'all'}
        }
    })
}

interface Meta {
    client: ApolloClient
    lastUsed: number
}

class ClientPool {
    private readonly map = new Map<string, Meta>()
    private readonly anon = 'anon'
    private timer: ReturnType<typeof setInterval> | undefined

    constructor(
        private url: string,
        private credentialsInCookies: CredentialsInCookies = 'include',
        private cachePolicy: CachePolicy = 'cache-first',
        private maxIdleMs = 30 * 60_000,
        private sweepEveryMs = 5 * 60_000
    ) {
        this.map.set(this.anon, this.newMeta())
        this.timer = setInterval(() => this.sweep(), this.sweepEveryMs)
        if (typeof (this.timer as any)?.unref === 'function') (this.timer as any).unref()
    }

    private now() {
        return Date.now()
    }

    private key(tok: Token) {
        return tok ? `t:${tok}` : this.anon
    }

    private newMeta(): Meta {
        return {
            client: makeClient(this.url, this.cachePolicy, this.credentialsInCookies),
            lastUsed: this.now()
        }
    }

    get(tok: Token) {
        const k = this.key(tok)
        const meta = this.map.get(k) ?? (this.map.set(k, this.newMeta()), this.map.get(k)!)
        meta.lastUsed = this.now()
        return meta.client
    }

    private sweep() {
        const cutoff = this.now() - this.maxIdleMs
        for (const [k, m] of this.map) {
            if (k === this.anon) continue
            if (m.lastUsed < cutoff) {
                try {
                    void m.client.clearStore()
                } catch {
                }
                this.map.delete(k)
            }
        }
    }

    remove(tok: Token) {
        const k = this.key(tok)
        if (k === this.anon) return
        const meta = this.map.get(k)
        if (!meta) return
        try {
            void meta.client.clearStore()
        } catch {
        }
        this.map.delete(k)
        console.log(`[ClientPool] Removed client for ${k}`)
    }

    clearAll() {
        for (const [k, meta] of this.map) {
            if (k === this.anon) continue
            try {
                void meta.client.clearStore()
            } catch {
            }
            this.map.delete(k)
        }
    }
}

export function createClientPool(
    {directusUrl}: { directusUrl: string },
    cfg?: {
        credentialsInCookies?: CredentialsInCookies
        cachePolicy: CachePolicy
        maxIdleMs?: number
        sweepEveryMs?: number
    }
) {
    const pool = new ClientPool(
        directusUrl,
        cfg?.credentialsInCookies,
        cfg?.cachePolicy,
        cfg?.maxIdleMs,
        cfg?.sweepEveryMs
    )

    const proxy = new Proxy(
        {},
        {
            get(_t, prop) {
                if (prop === 'removeClient') return (token: Token) => pool.remove(token)
                if (prop === 'clearAllClients') return () => pool.clearAll()

                return (...args: any[]) => {
                    const token: Token = args?.[0]?.context?.token ?? null
                    const real: any = pool.get(token)
                    const value = (real as any)[prop]
                    return typeof value === 'function' ? value.apply(real, args) : value
                }
            },
            getPrototypeOf() {
                return ApolloClient.prototype
            }
        }
    )

    return proxy as unknown as ApolloClientType & {
        removeClient: (token: Token) => void
        clearAllClients: () => void
    }
}
