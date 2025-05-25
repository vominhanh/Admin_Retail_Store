import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { ICategory } from "@/interfaces/category.interface";
import { CategoryModel } from "@/models/Category";
import { getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { NextRequest, NextResponse } from "next/server";

type collectionType = ICategory;
const collectionName: ECollectionNames = ECollectionNames.CATEGORY;
const collectionModel = CategoryModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;


export const POST = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - POST ${collectionName}`, ETerminal.FgYellow);

  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.CREATE, 
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

  const category: collectionType = await req.json();
  console.log(`category`,category)

  try {
    connectToDatabase();

    const newCategory = new collectionModel({
      created_at: new Date(),
      updated_at: new Date(),
      name: category.name,
      code: category.code,
      discount: category.discount,
      subcategories: category.subcategories
    });

    const savedCategory: collectionType = await newCategory.save();

    if (!savedCategory)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    // Khi tạo mới sản phẩm, cần vô hiệu hóa cache để lần tải tiếp theo sẽ lấy dữ liệu mới nhất

    return NextResponse.json(savedCategory, { status: EStatusCode.CREATED });
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to create ${collectionName}.`,
        error as string,
        path,
        `Please contact for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};

export const GET = async (): Promise<NextResponse> => {
  console.log("get category")
  return await getCollectionsApi<collectionType>(
    collectionName, 
    collectionModel, 
    path
  );
}
