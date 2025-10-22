// A generic constructor type
type Ctor<I = any, A extends any[] = any[]> = new (...args: A) => I;

/**
 * BaseModel
 * - Handles raw data
 * - Provides type-safe static create() and createFromArray() helpers
 */
export abstract class BaseModel<T extends object> {
    constructor(public raw: T) {
    }

    /** Create a proxied instance */
    static create<R extends object, C extends Ctor<any, [R]>>(
        this: C,
        raw: R
    ): R & InstanceType<C> {
        const instance = new this(raw as R);
        return new Proxy(instance as any, {
            get(target, prop, receiver) {
                if (prop in target) return Reflect.get(target, prop, receiver);
                if (prop in target.raw) return Reflect.get(target.raw, prop, receiver);
            }
        }) as R & InstanceType<C>;
    }

    /** Create multiple proxied instances */
    static createFromArray<
        R extends object,
        C extends Ctor<any, [R]> & { create(raw: R): R & InstanceType<C> }
    >(this: C, raws: R[]): Array<R & InstanceType<C>> {
        return raws.map(raw => this.create(raw));
    }

    /** Get original raw object */
    toRaw(): T {
        return this.raw;
    }
}

/**
 * Mixin for adding a typed `.t` getter
 */
type AnyCtor = new (...args: any[]) => any;

export const WithTranslation =
    <TT>() =>
        <B extends AnyCtor>(Base: B) =>
            class extends Base {
                get t(): TT | undefined {
                    // expects subclass to have `translations` array
                    // @ts-ignore
                    return this.translations?.[0];
                }
            };
