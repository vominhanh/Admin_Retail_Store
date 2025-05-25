import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IOrderFormProductDetail } from "@/interfaces/order-form.interface";
import { IProductDetail } from "@/interfaces/product-detail.interface";
import { ISupplierReceipt } from "@/interfaces/supplier-receipt.interface";
import { ProductDetailModel } from "@/models/ProductDetail";
import { SupplierReceiptModel } from "@/models/SupplierReceipt";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { isIdsExist } from "@/utils/is-ids-exist";
import { isIdsValid } from "@/utils/is-ids-valid";
import { print } from "@/utils/print";
import { NextRequest, NextResponse } from "next/server";

type collectionType = ISupplierReceipt;
const collectionName: ECollectionNames = ECollectionNames.SUPPLIER_RECEIPT;
const collectionModel = SupplierReceiptModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - POST ${collectionName}`, ETerminal.FgYellow );

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

  const supplierReceipt: collectionType = await req.json();

  try {
    connectToDatabase();

    const supplierReceiptProductDetailIds: string[] = 
      supplierReceipt.product_details.map(
        (supplierReceiptProductDetail: IOrderFormProductDetail) => 
          supplierReceiptProductDetail._id
      );

    if ( !isIdsValid(supplierReceiptProductDetailIds) ) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ID in supplier receipt's product details is not valid.`,
          path, 
          `Please check if the ${ECollectionNames.PRODUCT_DETAIL} ID is correct.`, 
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    const isProductDetailIdsExist: boolean = await isIdsExist<IProductDetail>(
      supplierReceiptProductDetailIds, 
      ProductDetailModel
    );

    if ( !isProductDetailIdsExist ) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.PRODUCT_DETAIL} in supplier receipt's product details does not exist in our records.`,
          path, 
          `Please check if the ${ECollectionNames.PRODUCT_DETAIL} ID is correct.`, 
        ),          
        { status: EStatusCode.NOT_FOUND }
      );
    
    const newSupplierReceipt = new collectionModel({
      created_at: new Date(), 
      updated_at: new Date(), 
      product_details: supplierReceipt.product_details, 
    });

    const savedSupplierReceipt: collectionType = 
      await newSupplierReceipt.save();

    if (!savedSupplierReceipt)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path, 
          `Please contact for more information.`, 
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(savedSupplierReceipt, { status: EStatusCode.CREATED });
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
