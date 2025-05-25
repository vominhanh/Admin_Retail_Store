import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "./constants";
import { decrypt } from "./utils/decrypt";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token: string = req.cookies.get(COOKIE_NAME)?.value || ``;

  // Nếu không có token, chuyển hướng về trang đăng nhập
  if (!token) {
    return NextResponse.redirect(new URL(`/`, req.url));
  }

  // Kiểm tra các đường dẫn yêu cầu quyền admin
  const path = req.nextUrl.pathname;

  const adminPaths = [
    '/home/account',
    '/home/user',
    '/home/business',
    '/home/unit',
    '/home/category',
    '/home/product',
    '/home/order-form',
    '/home/warehouse-receipt'
  ];

  // Kiểm tra xem path hiện tại có trong danh sách đường dẫn yêu cầu admin không
  const isAdminPath = adminPaths.some(adminPath =>
    path === adminPath || path.startsWith(`${adminPath}/`)
  );

  // Nếu đường dẫn không yêu cầu admin, cho phép truy cập
  if (!isAdminPath) {
    return NextResponse.next();
  }

  // Giải mã token để lấy thông tin người dùng
  try {
    const payload = await decrypt(token);

    // Kiểm tra trường is_admin trong payload
    if (payload && payload.is_admin === true) {
      return NextResponse.next();
    }

    // Nếu không phải admin và truy cập vào đường dẫn yêu cầu admin, chuyển hướng về trang chủ
    return NextResponse.redirect(new URL(`/home`, req.url));
  } catch (error) {
    // Nếu có lỗi khi giải mã token, chuyển hướng về trang đăng nhập
    return NextResponse.redirect(new URL(`/`, req.url));
  }
}

export const config = {
  matcher: [
    `/home`,
    `/home/(.*)`,
  ]
}
