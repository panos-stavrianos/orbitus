// plugin.ts
import {readFileSync} from "node:fs";
import * as path from "node:path";
import Handlebars from "handlebars";
import type {PluginFunction} from "@graphql-codegen/plugin-helpers";

const BASEMODEL_IMPORT = `import { BaseModel } from "orbitus";`;

function capAllFirstLetters(str: string): string {
    return str
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("_");
}

type FieldIR = {
    name: string;
    isList: boolean;
    isModel: boolean;
    modelName?: string;
};

type TypeIR = {
    TypeName: string;
    RawAlias: string;
    fields: FieldIR[];
};

export const plugin: PluginFunction = (schema, _docs, _cfg, info) => {
    const ctx = (info as any)?.pluginContext ?? {};
    const collections: Record<string, string> = ctx.collections ?? {};
    const modelsPath: string = ctx.modelsPath ?? "";
    const tmplSrc = readFileSync(
        path.resolve(__dirname, "model.hbs"),
        "utf8"
    );
    const tmpl = Handlebars.compile<TypeIR>(tmplSrc, {noEscape: true});

    // Gather GraphQL object types (skip introspection)
    const types: any[] = Object.values(schema.getTypeMap()).filter(
        (t: any) =>
            t?.astNode?.kind === "ObjectTypeDefinition" && !t.name.startsWith("__")
    );

    const out: string[] = [];

    // Header imports once
    out.push(BASEMODEL_IMPORT);
    if (Object.keys(collections).length) {
        out.push(
            `import { ${Object.values(collections).join(", ")} } from "${modelsPath}";`
        );
    }

    // Per-type emission
    for (const t of types) {
        const TypeName = capAllFirstLetters(t.name);
        const RawAlias = `Raw_${TypeName}`;

        const fields: FieldIR[] = Object.entries(t.getFields()).map(
            ([name, field]: [string, any]) => {
                const fieldType = String(field.type); // e.g. [Article!]!
                const baseType = fieldType.replace(/[!\[\]]/g, ""); // Article
                const isList = fieldType.startsWith("[");
                const isModel = baseType in collections;
                return {
                    name,
                    isList,
                    isModel,
                    modelName: isModel ? collections[baseType] : undefined,
                };
            }
        );

        const code = tmpl({TypeName, RawAlias, fields});
        out.push(code);
    }

    // Single concatenated TS file
    return out.join("\n\n");
};
