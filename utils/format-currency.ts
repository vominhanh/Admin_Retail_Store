/**
 * Định dạng số thành chuỗi tiền tệ
 * @param amount Số tiền cần định dạng
 * @param countryCode Mã quốc gia (mặc định: vi-VN)
 * @param currency Loại tiền tệ (mặc định: VND)
 * @param minimumFractionDigits Số chữ số thập phân tối thiểu (mặc định: 0)
 * @param maximumFractionDigits Số chữ số thập phân tối đa (mặc định: 0)
 * @returns Chuỗi tiền tệ đã được định dạng
 */
export const formatCurrency = (
  amount: number,
  countryCode: string = 'vi-VN',
  currency: string = 'VND',
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 0,
): string =>
  new Intl.NumberFormat(countryCode, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
    trailingZeroDisplay: 'stripIfInteger',
  }).format(amount);
