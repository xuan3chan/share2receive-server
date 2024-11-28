export interface PopulatedReport extends Report {
    target?: any; // Dùng `any` nếu target có thể là nhiều loại khác nhau (Product hoặc SubOrder)
  }