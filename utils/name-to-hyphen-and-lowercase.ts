/**
 * Chuyển đổi chuỗi thành dạng lowercase, loại bỏ dấu tiếng Việt và thay thế khoảng trắng bằng dấu gạch ngang
 * @param name Chuỗi cần chuyển đổi
 * @returns Chuỗi đã được chuyển đổi không có dấu và ký tự đặc biệt
 */
export const nameToHyphenAndLowercase = (name: string): string => {
  // Loại bỏ dấu tiếng Việt
  const withoutAccents = name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  // Chuyển thành chữ thường và thay thế khoảng trắng bằng gạch ngang
  // Loại bỏ các ký tự đặc biệt, chỉ giữ lại chữ cái, số và gạch ngang
  return withoutAccents.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};
