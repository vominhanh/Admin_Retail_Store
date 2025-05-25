import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IProductDetail } from "@/interfaces/product-detail.interface";
import { IProduct } from "@/interfaces/product.interface";
import { ProductModel } from "@/models";
import { ProductDetailModel } from "@/models/ProductDetail";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type collectionType = IProductDetail;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT_DETAIL;
const collectionModel = ProductDetailModel;
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

  const productDetail: collectionType = await req.json();

  try {
    connectToDatabase();

    if (!isValidObjectId(productDetail.product_id))
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ID '${productDetail.product_id}' is not valid.`,
          path,
          `Please check if the ${ECollectionNames.PRODUCT} ID is correct.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    const foundProduct: IProduct | null =
      await ProductModel.findById(productDetail.product_id);

    if (!foundProduct)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ${ECollectionNames.PRODUCT} with the ID '${productDetail.product_id}' does not exist in our records.`,
          path,
          `Please check if the ${ECollectionNames.PRODUCT} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    const newProductDetail = new collectionModel({
      created_at: new Date(),
      updated_at: new Date(),

      product_id: productDetail.product_id,
      input_quantity: productDetail.input_quantity,
      output_quantity: productDetail.output_quantity || 0,
      inventory: productDetail.input_quantity - (productDetail.output_quantity || 0),
      date_of_manufacture: productDetail.date_of_manufacture,
      expiry_date: productDetail.expiry_date,
    });

    const savedProductDetail: collectionType = await newProductDetail.save();

    if (!savedProductDetail)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(savedProductDetail, { status: EStatusCode.CREATED });
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
}

export const GET = async (): Promise<NextResponse> =>
  await getCollectionsApi<collectionType>(
    collectionName,
    collectionModel,
    path
  );

export const DELETE = async (): Promise<NextResponse> =>
  await deleteCollectionsApi<collectionType>(
    collectionName,
    collectionModel,
    path
  );
