import { NextRequest, NextResponse } from "next/server";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { print } from "@/utils/print";
import { connectToDatabase } from "@/utils/database";
import { createErrorMessage } from "@/utils/create-error-message";
import { ROOT } from "@/constants/root.constant";
import { IProduct } from "@/interfaces/product.interface";
import { ProductModel } from "@/models/Product";
import mongoose from 'mongoose';

type collectionType = IProduct;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT;
const collectionModel = ProductModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/[id]`;

export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgMagenta);

  const product: collectionType = await req.json();

  try {
    connectToDatabase();

    const foundProduct: collectionType | null =
      await collectionModel.findById(product._id);

    if (!foundProduct)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `The ${collectionName} with the ID '${product._id}' does not exist in our records.`,
          path,
          `Please check if the ${collectionName} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    const updatedProduct = await collectionModel.findOneAndUpdate(
      { _id: product._id },
      {
        $set: {
          name: product.name,
          description: product.description,
          input_price: product.input_price,
          output_price: product.output_price,
          code: product.code,
          category_id: product.category_id,
          image_links: product.image_links,
          updated_at: new Date(),
        }
      }
    );

    if (!updatedProduct)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(updatedProduct, { status: EStatusCode.CREATED });
  } catch (error: unknown) {
    console.error(error);

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

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { id } = await Promise.resolve(context.params);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID sản phẩm không hợp lệ' },
        { status: 400 }
      );
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin sản phẩm: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  await connectToDatabase();
  const { id } = await Promise.resolve(context.params);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: 'ID sản phẩm không hợp lệ' },
      { status: 400 }
    );
  }

  const deleted = await ProductModel.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json(
      { error: 'Không tìm thấy sản phẩm để xóa!' },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
