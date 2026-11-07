import type { FieldDefinition, FieldType, Collection } from './index';

export interface FieldOptions {
  label?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select
  description?: string;
}

export type FieldHelper = (keyOrOpts?: string | FieldOptions, maybeOpts?: FieldOptions) => FieldDefinition;

function createFieldHelper(type: FieldType): FieldHelper {
  return (keyOrOpts?: string | FieldOptions, maybeOpts?: FieldOptions): FieldDefinition => {
    let key = '';
    let opts: FieldOptions = {};

    if (typeof keyOrOpts === 'string') {
      key = keyOrOpts;
      opts = maybeOpts || {};
    } else if (typeof keyOrOpts === 'object') {
      opts = keyOrOpts || {};
    }

    const label = opts.label || (key ? formatDefaultLabel(key) : '');

    return {
      id: `f_${key || Math.random().toString(36).substring(2, 9)}`,
      key,
      label,
      type,
      required: opts.required ?? false,
      placeholder: opts.placeholder,
      options: opts.options,
      description: opts.description
    };
  };
}

function formatDefaultLabel(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export const text = createFieldHelper('text');
export const longtext = createFieldHelper('longtext');
export const richtext = createFieldHelper('richtext');
export const number = createFieldHelper('number');
export const boolean = createFieldHelper('boolean');
export const date = createFieldHelper('date');
export const media = createFieldHelper('media');
export const select = (
  keyOrOpts?: string | (FieldOptions & { options?: string[] }),
  maybeOpts?: FieldOptions & { options?: string[] }
): FieldDefinition => {
  const helper = createFieldHelper('select');
  return helper(keyOrOpts as any, maybeOpts as any);
};

export type FieldsInput =
  | FieldDefinition[]
  | Record<string, FieldDefinition | ((key: string) => FieldDefinition)>;

export interface DefineCollectionOptions {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  fields: FieldsInput;
}

export function defineCollection(opts: DefineCollectionOptions): Collection {
  let normalizedFields: FieldDefinition[] = [];

  if (Array.isArray(opts.fields)) {
    normalizedFields = opts.fields.map((f, idx) => ({
      ...f,
      id: f.id || `f_${f.key || idx}`
    }));
  } else if (typeof opts.fields === 'object' && opts.fields !== null) {
    normalizedFields = Object.entries(opts.fields).map(([key, fieldDef]) => {
      const def = typeof fieldDef === 'function' ? (fieldDef as any)(key) : fieldDef;
      return {
        ...def,
        key: def.key || key,
        label: def.label || formatDefaultLabel(key),
        id: def.id || `f_${key}`
      };
    });
  }

  const now = new Date().toISOString();

  return {
    id: `col_${opts.slug}`,
    slug: opts.slug,
    name: opts.name,
    description: opts.description || null,
    icon: opts.icon || 'collection',
    fields: normalizedFields,
    created_at: now,
    updated_at: now
  };
}

export interface CMSConfig {
  collections: Collection[];
}

export function defineConfig(config: CMSConfig): CMSConfig {
  return config;
}

