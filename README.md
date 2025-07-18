# 🛰️ Orbitus

**Type‑safe model generation and GraphQL helpers for Directus.**

`Orbitus` is a CLI tool and utility library that generates models and wraps GraphQL queries from [Directus](https://directus.io/), using [GraphQL Code Generator](https://the-guild.dev/graphql/codegen/docs/getting-started) under the hood. It also exports base models and helpers that can be extended in your project.

Perfect match for **SvelteKit**, but works with **any TypeScript project**.

---

## ✨ Features

* 🌍 **Built‑in support for multilingual content** – handle `translations[]` cleanly with a helper
* 🧠 **Type‑safe models** from your Directus collections
* 🔌 **Auto‑wrap GraphQL** queries & mutations
* 🧱 **Extendable base models** with custom logic
* 🛠️ **CLI for fast codegen**, fits any build pipeline
* 🎯 **Framework‑agnostic**: Works with SvelteKit, Next.js, Node, etc.

---

## 🔑 Required Environment Variable

Orbitus relies on a single mandatory environment variable:

| Variable              | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `PUBLIC_DIRECTUS_URL` | Base URL of your Directus instance (without a trailing slash). |

The variable is used to build the endpoint for every GraphQL query.
If it’s missing, Orbitus will throw during runtime.

---

## 🚀 Installation

```bash
npm install orbitus
```

---

## ⚙️ Configuration

Create a `orbitus.config.js` file at the root of your project:

```javascript
/**
 * @typedef {import('orbitus').OrbitusConfig} OrbitusConfig
 */

/** @type {OrbitusConfig} */
const config = {
  apiUrl: 'https://directus.example.com',
  adminToken: 'secret-admin-token',
  output: 'src/lib/graphql',
  modelsPath: '$lib/models',
  documents: 'src/**/*.gql',
  collections: {
    articles: 'ArticleModel',
    articles_translations: 'ArticleTranslationModel',
    articles_files: 'ArticleFileModel',
    info: 'InfoModel',
    info_translations: 'InfoTranslationModel',
    directus_files: 'FileModel'
  }
};

export default config;
```

### 🔍 Config Breakdown

* **`apiUrl`** – Your Directus instance URL
* **`adminToken`** – Optional token for full schema access
* **`output`** – Where generated files are saved
* **`modelsPath`** – Path to your extended models
* **`documents`** – Glob for GraphQL operations
* **`collections`** – Maps collection names to your model class names

---

## 🧱 Creating Models

This library generates `*_ModelBase` classes you can extend with your own logic.

```ts
// article-model.ts
import {
  Articles_ModelBase,
  Articles_Translations_ModelBase
} from '$lib/graphql/model-bases';
import { WithTranslation } from 'orbitus';

export class ArticleTranslationModel extends Articles_Translations_ModelBase {}

export class ArticleModel extends WithTranslation<ArticleTranslationModel>()(Articles_ModelBase) {
  get imagesList() {
    return this.images?.map(img => img?.directus_files_id);
  }
}
```

If there's no `translations[]` field:

```ts
// file-model.ts
import { Directus_Files_ModelBase } from '$lib/graphql/model-bases';

export class FileModel extends Directus_Files_ModelBase {
  get url() {
    return `${PUBLIC_DIRECTUS_URL}/assets/${this.id}`;
  }
}
```

---

## ⚡ Quick Start: From Raw to Typed Models

> Go from `data.articles` → `ArticleModel` instances with zero boilerplate.

```ts
import { ArticleModel } from './article-model';
import { AsyncGetArticleBySlug } from './graphql/generated';

const { data } = await AsyncGetArticleBySlug({
  variables: { lang: 'en-US', slug: 'my-first-post' }
});

const article = ArticleModel.create(data.articles[0]);

console.log(article.slug);         // raw field
console.log(article.t?.title);     // translated title
console.log(article.imagesList);   // your custom method

const articles = ArticleModel.createFromArray(data.articles);
```

Need raw JSON again? Just call `article.toRaw()`.

---

## ⚠️ Accessing Directus System Collections

When you query or mutate **Directus system collections** (e.g. `directus_users`) you must run the request against the `/graphql/system` endpoint.
With Orbitus, simply pass `system: true` inside the GraphQL `context` object:

```ts
await Login({
  variables: { email, password },
  context: { system: true } // 👈 mandatory for system collections
});
```

If `system: true` is omitted the request will default to the public endpoint and will fail with a permissions error.

---

## 🧪 CLI

Generate everything with a single command:

```bash
orbitus generate
```

Or run via `npx`:

```bash
npx orbitus generate
```

Or add it to `package.json`:

```json
"scripts": {
  "generate": "orbitus generate"
}
```

---

## 🧩 BaseModel API

All models extend `BaseModel`, which gives you access to:

* Raw field access (`model.raw`) and auto‑proxied access (`model.field`)
* Translation support via `.t` for localized fields (when using `WithTranslation()`)

### `create(raw: T): T & Model`

Wraps a single raw record.

### `createFromArray(raws: T[]): (T & Model)[]`

Wraps multiple raw records.

### `toRaw()`

Returns the original JSON object.

---

That’s it — write minimal code and get fully typed, ergonomic models for your Directus data. 🎯
