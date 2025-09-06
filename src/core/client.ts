// src/lib/graphql/client.ts
import type {ApolloClient as ApolloClientType, NormalizedCacheObject} from '@apollo/client/core/index.js'
import {ApolloClient, ApolloLink} from '@apollo/client/core/index.js'
import {InMemoryCache} from '@apollo/client/cache/cache.cjs'
import {HttpLink} from '@apollo/client/link/http/http.cjs'
import {setContext} from '@apollo/client/link/context/context.cjs'

type Token = string | null | undefined

function makeClient(directusUrl: string) {
    const defaultLink = new HttpLink({uri: `${directusUrl}/graphql`})
    const systemLink = new HttpLink({uri: `${directusUrl}/graphql/system`})

    const authLink = setContext((_, ctx: any) =>
        ctx?.token ? {headers: {...ctx.headers, authorization: `Bearer ${ctx.token}`}} : ctx
    )

    const http = ApolloLink.split(op => op.getContext().system === true, systemLink, defaultLink)

    return new ApolloClient<NormalizedCacheObject>({
        link: ApolloLink.from([authLink, http]),
        cache: new InMemoryCache(),
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
        return {client: makeClient(this.url), lastUsed: this.now()}
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

    destroy(token: Token) {
        const k = this.key(token)
        const meta = this.map.get(k)
        if (meta) {
            try {
                void meta.client.clearStore()
            } catch {
            }
            this.map.delete(k)
            console.log(`[ClientPool] Destroyed client for key ${k}`, 'length=', this.map.size)
        }
    }
}

export function createClientPool(
    {directusUrl}: { directusUrl: string },
    cfg?: { maxIdleMs?: number; sweepEveryMs?: number }
) {
    if (!directusUrl) throw new Error('Missing Directus URL')
    const pool = new ClientPool(directusUrl, cfg?.maxIdleMs, cfg?.sweepEveryMs)

    return new Proxy({}, {
        get(_t, prop) {
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
    }) as unknown as ApolloClientType<NormalizedCacheObject>
}
