export interface ProductSearchCriteria {
  productName?: string; // Tìm kiếm theo tên sản phẩm
  categoryName?: string; // Tìm kiếm theo danh mục
  brandName?: string; // Tìm kiếm theo thương hiệu
  type?: 'sale' | 'barter'; // Lọc theo loại sản phẩm (bán hoặc trao đổi)
  price?: number
  condition?: 'new' | 'used'; // Lọc theo điều kiện của sản phẩm (mới hoặc đã sử dụng)
  tags?: string[]; // Lọc theo các tags
  material?: string; // Tìm kiếm theo chất liệu sản phẩm
  sizeVariants?: {
    size?: string;
    colors?: string;
    amount?: { min?: number; max?: number };
  }; // T
  style?: string; // Tìm kiếm theo phong cách
}
