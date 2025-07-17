import type {PluginFunction} from '@graphql-codegen/plugin-helpers';

const BASEMODEL_IMPORT = `import { BaseModel } from "orbitus";`;

/**
 * Generate one “_ModelBase” class for every GraphQL object type and
 * expose each field via a getter.  Nested models are detected via the
 * `collections` map you pass from CLI (pluginContext.collections).
 */
export const plugin: PluginFunction = async (
    schema,
    _docs,
    _cfg,
    info
) => {
    console.error('[directus-model] pluginContext =', (info as any).pluginContext);

    const ctx = (info as any).pluginContext ?? {};

    const collections: Record<string, string> = ctx.collections ?? {};
    const modelsPath: string = ctx.modelsPath ?? '';
    process.stdout.write(`[directus-model] collections: ${JSON.stringify(collections)}\n`);


    const importModels =
        Object.keys(collections).length
            ? `import { ${Object.values(collections).join(', ')} } from "${modelsPath}";`
            : '';

    const typeDefs = Object.values(schema.getTypeMap())
        .filter(
            (t) =>
                t.astNode?.kind === 'ObjectTypeDefinition' && !t.name.startsWith('__')
        )
        .map((t) => buildModelBase(t, collections))
        .join('\n\n');

    return [BASEMODEL_IMPORT, importModels, typeDefs].filter(Boolean).join('\n\n');
};

/* ----------------------- helpers ---------------------------------- */

function buildModelBase(
    type: any,
    known: Record<string, string>
): string {
    const typeName = capitalizeAllFirstLetters(type.name);

    const fields = Object.entries(type.getFields())
        .map(([fieldName, field]: [string, any]) => {
            const fieldType = String(field.type);        // e.g. [Article!]!
            const baseType = fieldType.replace(/[!\[\]]/g, ''); // Article
            const isList = fieldType.startsWith('[');
            // console.log(`Processing field: ${fieldName} of type ${fieldType} (base: ${baseType}, isList: ${isList})`);
            /* nested-model detection */
            if (baseType in known) {
                const modelName = known[baseType];
                if (isList) {
                    return `  get ${fieldName}() {
    return this.raw.${fieldName}
      ? this.raw.${fieldName}.map((item: any) => new ${modelName}(item))
      : [];
  }`;
                }
                return `  get ${fieldName}(): ${modelName} | null {
    return this.raw.${fieldName} ? new ${modelName}(this.raw.${fieldName}) : null;
  }`;
            }

            /* primitive passthrough */
            return `  get ${fieldName}() { return this.raw.${fieldName}; }`;
        })
        .join('\n');

    return `
import type { ${typeName} as Raw_${typeName} } from './generated';

export class ${typeName}_ModelBase extends BaseModel<Raw_${typeName}> {
${fields}
}`.trim();
}

function capitalizeAllFirstLetters(str: string): string {
    return str
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('_');
}
