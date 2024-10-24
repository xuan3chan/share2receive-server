import { Schema } from 'mongoose';
import slugify from 'slugify';

export function SlugHook(schema: Schema, fieldName: string, options?: any) {
  schema.add({ slug: { type: String, unique: true } }); // Đảm bảo slug là duy nhất

  schema.pre('save', function (next) {
    if (this.isModified(fieldName) || this.isNew) {
      // Tạo slug từ trường fieldName
      const baseSlug = slugify(this[fieldName] as string, { lower: true, strict: true });

      // Thêm timestamp (có thể là ngày giờ hiện tại hoặc chỉ là thời gian timestamp)
      const timestamp = Date.now(); // Có thể dùng định dạng ngày nếu cần chi tiết hơn
      
      // Kết hợp slug với timestamp
      this.slug = `${baseSlug}-${timestamp}`;
    }
    next();
  });
}
