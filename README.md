# 🛰️ Orbitus

**Type‑safe model generation & GraphQL helpers for Directus.**

> Build fully‑typed data access in minutes. Works great with **SvelteKit** but plugs into **any TypeScript project**.

---

## 🚀 TL;DR

```bash
npm i orbitus                     # install
export PUBLIC_DIRECTUS_URL="https://directus.example.com"  # required env var
npx orbitus generate              # generate models + typed GraphQL
```

---

## ✨ Features

* 🧠 **Type‑safe models** generated from your collections
* 🔌 **Auto‑wrapped GraphQL** queries & mutations
* 🧱 **Extendable base models** for custom logic
* 🛠️ **Zero‑config CLI** that fits any build pipeline
* 🌍 **Seamless multilingual content** — handle `translations[]` with a helper

---

## 🔑 Prerequisite

| Env Variable          | Description                                       |
| --------------------- | ------------------------------------------------- |
| `PUBLIC_DIRECTUS_URL` | Base URL of your Directus instance **(no slash)** |

Orbitus builds every GraphQL endpoint from this value and will throw at runtime if it’s missing.

---

## 📦 Installation

```bash
npm install orbitus
```

Add the env variable to `.env` (or your platform‑specific secret store).

---

## ⚙️ Configuration (`orbitus.config.js`)

```javascript
/** @typedef {import('orbitus').OrbitusConfig} OrbitusConfig */

/** @type {OrbitusConfig} */
const config = {
    apiUrl: 'https://directus.example.com',   // Directus instance
    adminToken: 'secret-admin-token',         // optional — unlock full schema
    output: 'src/lib/graphql',                // generated files
    modelsPath: '$lib/models',                // where your extended models live
    documents: 'src/**/*.gql',                // GraphQL ops glob
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

### 🔍 Field Guide

| Key           | Notes                                   |
| ------------- | --------------------------------------- |
| `apiUrl`      | URL to your Directus instance           |
| `adminToken`  | **Optional** — required for full schema |
| `output`      | Folder where Orbitus writes generated   |
| `modelsPath`  | Path to your extended models            |
| `documents`   | Glob pattern for `.gql` operations      |
| `collections` | Map collection → class name             |

---

## 🧱 Extending Models

Orbitus creates `*_ModelBase` classes. Extend them to add domain logic:

```ts
// models.ts
import {Directus_Files_ModelBase} from '$lib/graphql/model-bases';
import {PUBLIC_DIRECTUS_URL} from '$env/static/public';

export class FileModel extends Directus_Files_ModelBase {
    get url() {
        return `${PUBLIC_DIRECTUS_URL}/assets/${this.id}`;
    }
}
```

If you need to handle translations, use the `WithTranslation` helper:

```ts
// models.ts
import {
    Articles_ModelBase,
    Articles_Translations_ModelBase
} from '$lib/graphql/model-bases';
import {WithTranslation} from 'orbitus';

export class ArticleModel extends WithTranslation<Articles_Translations_ModelBase>()(Articles_ModelBase) {
    get imagesList() {
        return this.images?.map(img => img?.directus_files_id);
    }
}
```

---

## ⚡ Quick Usage

```ts
import {ArticleModel} from './models';
import {AsyncGetArticleBySlug} from './graphql/generated';

const {data} = await AsyncGetArticleBySlug({
    variables: {lang: 'en-US', slug: 'my-first-post'}
});

const article = ArticleModel.create(data.articles[0]);

console.log(article.slug);         // raw field
console.log(article.t?.title);     // translated title
console.log(article.imagesList);   // custom getter

// Multiple records
const articles = ArticleModel.createFromArray(data.articles);
```

Need raw JSON again? `article.toRaw()` has your back.

---

## 🔐 Authenticated Requests

When you need to execute a query or mutation on behalf of a logged‑in user, simply pass their **JWT access token** through the `context` option. Orbitus automatically attaches it as an `Authorization: Bearer` header:

```ts
await AsyncUpdateProfile({
    variables: {name: 'Alice'},
    context: {token: userToken}          // → Authorization: Bearer <token>
});
```

If you forget to supply a token where Directus expects authentication, the request will fail with **401 Unauthorized**.

---

## ⚠️ Accessing System Collections

When you hit **Directus system collections** (e.g. `directus_users`) you must use `/graphql/system`.

With Orbitus, just add `system: true` in the GraphQL context:

```ts
await Login({
    variables: {email, password},
    context: {system: true}
});
```

If omitted, the request goes to the default `/graphql` endpoint, and the request will fail.

---

## 🧪 CLI Commands

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `orbitus generate` | Generate models & wrapped queries |

Add a script:

```json
"scripts": {
  "generate": "orbitus generate"
}
```

---

## 🧩 BaseModel Cheatsheet

* **`create(raw)`** – Wrap one record
* **`createFromArray(raw[])`** – Wrap many
* **`toRaw()`** – Get original JSON
* `model.t` – Active translation (when using `WithTranslation`)

---

## 📜 License

MIT © Panos Stavrianos — happily accepting PRs 💜
