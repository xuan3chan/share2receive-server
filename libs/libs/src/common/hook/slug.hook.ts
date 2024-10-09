import { Schema } from 'mongoose';
import slugify from 'slugify';

export function SlugHook(schema: Schema, fieldName: string, options?: any) {
  schema.add({ slug: { type: String } });

  schema.pre('save', function (next) {
    if (this.isModified(fieldName) || this.isNew) {
      this.slug = slugify(this[fieldName] as string, { lower: true, strict: true });
    }
    next();
  });
}