// src/lib/graphql/client.ts
import type {ApolloClient as ApolloClientType, NormalizedCacheObject} from '@apollo/client/core/index.js'
import {ApolloClient, ApolloLink} from '@apollo/client/core/index.js'
import {InMemoryCache} from '@apollo/client/cache/cache.cjs'
import {HttpLink} from '@apollo/client/link/http/http.cjs'
import {setContext} from '@apollo/client/link/context/context.cjs'
import {CachePolicy} from "./types";

type Token = string | null | undefined

function makeClient(directusUrl: string, cachePolicy: CachePolicy): ApolloClient<NormalizedCacheObject> {
    const defaultLink = new HttpLink({uri: `${directusUrl}/graphql`})
    const systemLink = new HttpLink({uri: `${directusUrl}/graphql/system`})

    const authLink = setContext((_, ctx: any) =>
        ctx?.token ? {headers: {...ctx.headers, authorization: `Bearer ${ctx.token}`}} : ctx
    )

    const http = ApolloLink.split(op => op.getContext().system === true, systemLink, defaultLink)

    return new ApolloClient<NormalizedCacheObject>({
        cache: new InMemoryCache(),
        link: ApolloLink.from([authLink, http]),
        defaultOptions: {
            query: {
                fetchPolicy: cachePolicy,
                errorPolicy: 'all'
            },
            watchQuery: {
                fetchPolicy: cachePolicy,
                errorPolicy: 'all'
            }
        },
    })
}

interface Meta {
    client: ApolloClient<NormalizedCacheObject>
    lastUsed: number
}

class ClientPool {
    private readonly map = new Map<string, Meta>()
    private readonly anon = 'anon'
    private timer: any

    constructor(
        private url: string,
        private cachePolicy: CachePolicy = 'cache-first',
        private maxIdleMs = 30 * 60_000,  // 30 min default
        sweepEveryMs = 5 * 60_000         // sweep every 5 min
    ) {
        this.map.set(this.anon, this.newMeta())
        this.timer = setInterval(() => this.sweep(), sweepEveryMs)
        if (typeof this.timer?.unref === 'function') this.timer.unref()
    }

    private now() {
        return Date.now()
    }

    private key(tok: Token) {
        return tok ? `t:${tok}` : this.anon
    }

    private newMeta(): Meta {
        return {client: makeClient(this.url, this.cachePolicy), lastUsed: this.now()}
    }

    get(tok: Token) {
        const k = this.key(tok)
        const meta = this.map.get(k) ?? (this.map.set(k, this.newMeta()), this.map.get(k)!)
        meta.lastUsed = this.now()
        return meta.client
    }

    private sweep() {
        console.log('[ClientPool] Sweep start', 'length=', this.map.size)
        const cutoff = this.now() - this.maxIdleMs
        for (const [k, m] of this.map) {
            if (k === this.anon) continue
            if (m.lastUsed < cutoff) {
                try {
                    void m.client.clearStore()
                } catch {
                }
                this.map.delete(k)
                console.log(`[ClientPool] Sweeping idle client for key ${k}`, 'length=', this.map.size)
            }
        }
    }

    remove(tok: Token) {
        const k = this.key(tok)
        if (k === this.anon) return // keep anon if you want
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
        cachePolicy: CachePolicy,
        maxIdleMs?: number;
        sweepEveryMs?: number
    }
) {
    const pool = new ClientPool(directusUrl, cfg?.cachePolicy, cfg?.maxIdleMs, cfg?.sweepEveryMs)

    const proxy = new Proxy({}, {
        get(_t, prop) {
            // expose control methods explicitly
            if (prop === 'removeClient') {
                return (token: Token) => pool.remove(token)
            }
            if (prop === 'clearAllClients') {
                return () => pool.clearAll()
            }

            // normal Apollo delegation
            return (...args: any[]) => {
                const token: Token = args?.[0]?.context?.token ?? null
                const real: any = pool.get(token)
                const value = real[prop]
                return typeof value === 'function' ? value.apply(real, args) : value
            }
        },
        getPrototypeOf() {
            return ApolloClient.prototype
        }
    })

    return proxy as unknown as ApolloClientType<NormalizedCacheObject> & {
        removeClient: (token: Token) => void
        clearAllClients: () => void
    }
}