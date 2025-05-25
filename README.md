# Quản Lý Cửa Hàng Bán Lẻ

## Tối ưu API và Triển khai React Query

# Hướng dẫn sử dụng hệ thống mã vạch và số lô

## Tổng quan
Hệ thống hiện đã được tích hợp mã vạch (Barcode) cho từng lô sản phẩm. Mỗi sản phẩm khi nhập kho sẽ được tự động tạo số lô (batch number) và mã vạch tương ứng.

## Quy trình hoạt động

### 1. Tạo phiếu nhập kho
- Khi tạo phiếu nhập kho và chọn sản phẩm, hệ thống sẽ tự động tạo số lô (batch_number) duy nhất cho mỗi sản phẩm.
- Số lô được tạo theo định dạng: `PREFIX-YYYYMMDD-RANDOM`
  - PREFIX: 5 ký tự đầu của product_id
  - YYYYMMDD: Ngày tháng năm hiện tại
  - RANDOM: 4 chữ số ngẫu nhiên

### 2. Mã vạch (Barcode)
- Mã vạch được tạo tự động dựa trên số lô của sản phẩm.
- Sử dụng chuẩn CODE128 cho mã vạch, đảm bảo tương thích với hầu hết các máy quét.
- Mã vạch sẽ được hiển thị trong chi tiết sản phẩm và có thể in ra để dán lên sản phẩm.

### 3. Quản lý hàng tồn
- Mỗi lô sản phẩm có một mã vạch riêng, giúp dễ dàng phân biệt các lô khác nhau của cùng một sản phẩm.
- Hệ thống theo dõi số lượng nhập, xuất và tồn kho cho từng lô sản phẩm.
- Kiểm soát hạn sử dụng theo từng lô, giúp áp dụng nguyên tắc FIFO (First In, First Out) trong quản lý hàng hóa.

### 4. Lợi ích
- Truy xuất nguồn gốc: Biết chính xác thông tin của từng lô sản phẩm
- Kiểm soát chất lượng: Dễ dàng thu hồi một lô sản phẩm cụ thể nếu có vấn đề
- Quản lý hạn sử dụng: Theo dõi và cảnh báo các sản phẩm sắp hết hạn theo từng lô
- Quản lý kho: Chính xác và minh bạch hơn với việc theo dõi từng lô sản phẩm

## Hướng dẫn sử dụng
1. Khi tạo phiếu nhập kho, chọn sản phẩm để hệ thống tự động tạo số lô.
2. Có thể điều chỉnh số lô nếu cần thiết.
3. Sau khi lưu, mã vạch sẽ được tạo tự động dựa trên số lô.
4. Để in mã vạch, vào chi tiết của sản phẩm và sử dụng chức năng in mã vạch.

## Lưu ý
- Mỗi lô sản phẩm nên có một số lô duy nhất.
- Không nên thay đổi số lô sau khi đã tạo để đảm bảo tính nhất quán.
- Mã vạch tương thích với hầu hết các máy quét mã vạch thương mại. 

```
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
