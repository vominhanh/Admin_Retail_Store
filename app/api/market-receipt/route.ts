import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IMarketReceipt } from "@/interfaces/market-receipt.interface";
import { IProductDetail } from "@/interfaces/product-detail.interface";
import { IReceiptProduct } from "@/interfaces/warehouse-receipt.interface";
import { MarketReceiptModel } from "@/models/MarketReceipt";
import { ProductDetailModel } from "@/models/ProductDetail";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { isIdsExist } from "@/utils/is-ids-exist";
import { isIdsValid } from "@/utils/is-ids-valid";
import { print } from "@/utils/print";
import { NextRequest, NextResponse } from "next/server";

type collectionType = IMarketReceipt;
const collectionName: ECollectionNames = ECollectionNames.MARKET_RECEIPT;
const collectionModel = MarketReceiptModel;
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

  const marketReceipt: collectionType = await req.json();

  try {
    connectToDatabase();
    
    const marketReceiptProductDetailIds: string[] = 
      marketReceipt.product_details.map(
        (marketReceiptProductDetail: IReceiptProduct) => 
          marketReceiptProductDetail._id
      );

    if ( !isIdsValid(marketReceiptProductDetailIds) ) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ID in market receipt's product details is not valid.`,
          path, 
          `Please check if the ${ECollectionNames.PRODUCT_DETAIL} ID is correct.`, 
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    const isProductDetailIdsExist: boolean = 
      await isIdsExist<IProductDetail>(
        marketReceiptProductDetailIds, 
        ProductDetailModel
      );

    if ( !isProductDetailIdsExist ) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.PRODUCT_DETAIL} in market receipt's product details does not exist in our records.`,
          path, 
          `Please check if the ${ECollectionNames.PRODUCT_DETAIL} ID is correct.`, 
        ),          
        { status: EStatusCode.NOT_FOUND }
      );

    const newMarketReceipt = new collectionModel({
      created_at: new Date(), 
      updated_at: new Date(), 
      product_details: marketReceipt.product_details,
    });

    const savedMarketReceipt: collectionType = await newMarketReceipt.save();

    if (!savedMarketReceipt)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path, 
          `Please contact for more information.`, 
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(
      savedMarketReceipt, 
      { status: EStatusCode.CREATED }
    );
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
