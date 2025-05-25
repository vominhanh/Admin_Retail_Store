import { NextRequest, NextResponse } from "next/server";
import { deleteCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { print } from "@/utils/print";
import { connectToDatabase } from "@/utils/database";
import { createErrorMessage } from "@/utils/create-error-message";
import { ROOT } from "@/constants/root.constant";
import { isValidObjectId } from "mongoose";
import { ICategory } from "@/interfaces/category.interface";
import { CategoryModel } from "@/models/Category";

type collectionType = ICategory;
const collectionName: ECollectionNames = ECollectionNames.CATEGORY;
const collectionModel = CategoryModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgYellow);

  const id: string = (await params).id;
  const category: collectionType = await req.json();

  try {
    connectToDatabase();

    // Lỗi khi cập nhật không đảm bảo discount là số
    const updatedData = {
      ...category,
      discount: Number(category.discount),
      updated_at: new Date()
    };

    const updatedCategory = await collectionModel.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        createErrorMessage(
          `Cập nhật thất bại ${collectionName}.`,
          `Không tìm thấy ${collectionName} với id: ${id}`,
          path,
          `Vui lòng kiểm tra xem loại sản phẩm có tồn tại không.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );
    }

    return NextResponse.json(updatedCategory, { status: EStatusCode.OK });
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Cập nhật thất bại ${collectionName}.`,
        error as string,
        path,
        `Vui lòng liên hệ để biết thêm thông tin.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};

export const DELETE = async (
  _req: NextRequest, query: IQueryString
): Promise<NextResponse> =>
  await deleteCollectionByIdApi<collectionType>(
    collectionModel,
    collectionName,
    path,
    query
  );

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'ID sản phẩm không hợp lệ' },
        { status: 400 }
      );
    }

    const category = await CategoryModel.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Không tìm thấy sản phẩm' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Không thể lấy thông tin sản phẩm: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}
