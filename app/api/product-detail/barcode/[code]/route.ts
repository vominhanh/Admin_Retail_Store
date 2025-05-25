import { connectToDatabase } from "@/utils/database";
import { ProductDetailModel } from "@/models/ProductDetail";
import { ProductModel } from "@/models/Product";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        await connectToDatabase();
        const code = (await params).code;

        // Tìm chi tiết sản phẩm dựa trên batch_number hoặc barcode
        const productDetail = await ProductDetailModel.findOne({
            $or: [
                { batch_number: code },
                { barcode: code }
            ]
        });

        if (!productDetail) {
            return NextResponse.json(
                { message: "Không tìm thấy chi tiết sản phẩm với mã vạch này", success: false },
                { status: 404 }
            );
        }

        // Kiểm tra xem sản phẩm còn hàng không
        const inventory = productDetail.input_quantity - productDetail.output_quantity;
        if (inventory <= 0) {
            return NextResponse.json(
                { message: "Sản phẩm này đã hết hàng", success: false },
                { status: 400 }
            );
        }

        // Tìm thông tin sản phẩm
        const product = await ProductModel.findById(productDetail.product_id);

        if (!product) {
            return NextResponse.json(
                { message: "Không tìm thấy thông tin sản phẩm", success: false },
                { status: 404 }
            );
        }

        // Trả về thông tin kết hợp
        return NextResponse.json({
            productDetail: {
                ...productDetail.toObject(),
                inventory
            },
            product,
            success: true
        });
    } catch (error) {
        console.error("Lỗi khi tìm kiếm theo barcode:", error);
        return NextResponse.json(
            { message: "Đã xảy ra lỗi khi tìm kiếm", success: false },
            { status: 500 }
        );
    }
} 