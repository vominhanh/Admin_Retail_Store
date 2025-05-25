import { NextRequest, NextResponse } from "next/server";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { print } from "@/utils/print";
import { connectToDatabase } from "@/utils/database";
import { createErrorMessage } from "@/utils/create-error-message";
import { ROOT } from "@/constants/root.constant";
import { IProductDetail } from "@/interfaces/product-detail.interface";
import { ProductDetailModel } from "@/models/ProductDetail";
import { StockHistoryModel } from '@/models/StockHistory';

type collectionType = IProductDetail;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT_DETAIL;
const collectionModel = ProductDetailModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/[id]`;

export const PATCH = async (
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> => {
  const { id } = await Promise.resolve(context.params);
  print(`${collectionName} API - PATCH ${collectionName} ID: ${id}`, ETerminal.FgMagenta);

  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.UPDATE, 
  //   collectionName
  // );

  // if ( !isUserAdmin )
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to create ${collectionName}.`,
  //       `You dont have privilage to do this action.`,
  //       path, 
  //       `Please check if the account had privilage to do this action.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  try {
    const productDetail = await req.json();
    const { user_id, user_name } = productDetail;
    console.log(`Xử lý PATCH request cho product-detail/${id}`, productDetail);

    connectToDatabase();

    const foundProductDetail: collectionType | null =
      await collectionModel.findById(id);

    if (!foundProductDetail)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `The ${collectionName} with the ID '${id}' does not exist in our records.`,
          path,
          `Please check if the ${collectionName} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    // Kiểm tra hợp lệ số lượng
    const inputQty = productDetail.input_quantity !== undefined
      ? productDetail.input_quantity
      : foundProductDetail.input_quantity ?? 0;
    const outputQty = productDetail.output_quantity !== undefined
      ? productDetail.output_quantity
      : foundProductDetail.output_quantity ?? 0;

    if (outputQty > inputQty) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Số lượng đã bán (output_quantity) không được lớn hơn số lượng nhập (input_quantity)!`,
          path,
          `Vui lòng kiểm tra lại số lượng.`
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );
    }

    // Chuẩn bị đối tượng cập nhật
    const updateData: Partial<IProductDetail> = {
      updated_at: new Date(),
    };

    // Cập nhật các trường nếu chúng được cung cấp
    if (productDetail.date_of_manufacture) {
      updateData.date_of_manufacture = productDetail.date_of_manufacture;
    }

    if (productDetail.expiry_date) {
      updateData.expiry_date = productDetail.expiry_date;
    }

    // Xử lý input_quantity và output_quantity
    let oldOutputQuantity = undefined;
    if (productDetail.output_quantity !== undefined) {
      // Lấy input_quantity hiện tại từ database để tính inventory
      const currentDetail = await collectionModel.findById(id);
      if (currentDetail) {
        oldOutputQuantity = currentDetail.output_quantity;
      }
    }

    if (productDetail.input_quantity !== undefined && productDetail.output_quantity !== undefined) {
      // Nếu cả hai trường đều được cung cấp, sử dụng cả hai giá trị như nhận được
      updateData.input_quantity = productDetail.input_quantity;
      updateData.output_quantity = productDetail.output_quantity;
      // Cập nhật trường inventory
      updateData.inventory = productDetail.input_quantity - productDetail.output_quantity;
      console.log(`Cập nhật cả input_quantity (${productDetail.input_quantity}) và output_quantity (${productDetail.output_quantity})`);
    } else if (productDetail.input_quantity !== undefined) {
      // Chỉ cung cấp input_quantity, giữ nguyên output_quantity
      updateData.input_quantity = productDetail.input_quantity;

      // Lấy output_quantity hiện tại từ database để tính inventory
      const currentDetail = await collectionModel.findById(id);
      if (currentDetail) {
        updateData.inventory = productDetail.input_quantity - currentDetail.output_quantity;
      }

      console.log(`Cập nhật input_quantity thành ${productDetail.input_quantity} và tính toán inventory`);
    } else if (productDetail.output_quantity !== undefined) {
      // Chỉ cung cấp output_quantity, giữ nguyên input_quantity
      updateData.output_quantity = productDetail.output_quantity;

      // Lấy input_quantity hiện tại từ database để tính inventory
      const currentDetail = await collectionModel.findById(id);
      if (currentDetail) {
        updateData.inventory = currentDetail.input_quantity - productDetail.output_quantity;
      }

      console.log(`Cập nhật output_quantity thành ${productDetail.output_quantity} và tính toán inventory`);
    }

    console.log(`Dữ liệu cập nhật:`, updateData);

    const updatedProductDetail = await collectionModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );


    if (!updatedProductDetail)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    // Sau khi cập nhật xong, nếu output_quantity thay đổi thì lưu lịch sử xuất kho
    if (productDetail.output_quantity !== undefined && oldOutputQuantity !== undefined && productDetail.output_quantity > oldOutputQuantity) {
      const exportQuantity = productDetail.output_quantity - oldOutputQuantity;
      if (exportQuantity > 0) {
        await StockHistoryModel.create({
          product_id: updateData.product_id || (foundProductDetail && foundProductDetail.product_id),
          batch_number: foundProductDetail.batch_number,
          action: 'export',
          quantity: exportQuantity,
          related_receipt_id: null, // Có thể truyền id hóa đơn nếu có
          note: 'Xuất kho khi bán hàng',
          created_at: new Date(),
          user_id: user_id || null, // Lưu user_id nếu có
          user_name: user_name || null, // Lưu user_name nếu có
        });
      }
    }

    console.log(`Đã cập nhật thành công product-detail/${id}`);
    return NextResponse.json(updatedProductDetail, { status: EStatusCode.OK });
  } catch (error: unknown) {
    console.error(`Lỗi khi cập nhật product-detail/${id}:`, error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to update ${collectionName}.`,
        error as string,
        path,
        `Please contact for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = async (
  req: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> => {
  const { id } = await (context.params);
  print(`${collectionName} API - GET ${collectionName} ID: ${id}`, ETerminal.FgGreen);

  try {
    connectToDatabase();

    const foundProductDetail: collectionType | null =
      await collectionModel.findById(id);

    if (!foundProductDetail)
      return NextResponse.json(
        createErrorMessage(
          `Failed to get ${collectionName}.`,
          `The ${collectionName} with the ID '${id}' does not exist in our records.`,
          path,
          `Please check if the ${collectionName} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    return NextResponse.json(foundProductDetail, { status: EStatusCode.OK });
  } catch (error: unknown) {
    console.error(`Lỗi khi lấy product-detail/${id}:`, error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to get ${collectionName}.`,
        error as string,
        path,
        `Please contact for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const id = params.id;
    print(`${collectionName} API - DELETE ${collectionName} ID: ${id}`, ETerminal.FgRed);

    if (!id || id === 'undefined') {
      console.error(`Lỗi: ID không hợp lệ - ${id}`);
      return NextResponse.json(
        { message: `Invalid product detail ID: ${id}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    console.log(`Đang xóa product-detail với ID: ${id}`);

    // Kiểm tra xem product detail có tồn tại không trước khi xóa
    const existingProductDetail = await collectionModel.findById(id);
    if (!existingProductDetail) {
      console.error(`Không tìm thấy product-detail với ID: ${id}`);
      return NextResponse.json(
        { message: `${collectionName} not found with ID: ${id}` },
        { status: 404 }
      );
    }

    // Thực hiện xóa nếu product detail tồn tại
    const deletedProductDetail = await collectionModel.findByIdAndDelete(id);

    if (!deletedProductDetail) {
      console.error(`Xóa product-detail thất bại, ID: ${id}`);
      return NextResponse.json(
        { message: `Failed to delete ${collectionName}` },
        { status: 500 }
      );
    }

    console.log(`Đã xóa thành công product-detail với ID: ${id}`);
    return NextResponse.json(
      { message: `${collectionName} deleted successfully`, id: id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product detail:', error);
    return NextResponse.json(
      { message: `Error deleting ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
