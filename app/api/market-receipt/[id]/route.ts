import { NextRequest, NextResponse } from "next/server";
import { deleteCollectionByIdApi, getCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames } from "@/enums";
import { ROOT } from "@/constants/root.constant";
import { IMarketReceipt } from "@/interfaces/market-receipt.interface";
import { MarketReceiptModel } from "@/models/MarketReceipt";

type collectionType = IMarketReceipt;
const collectionName: ECollectionNames = ECollectionNames.MARKET_RECEIPT;
const collectionModel = MarketReceiptModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/[id]`;

export const GET = async (
  _req: NextRequest, query: IQueryString
): Promise<NextResponse> => 
  await getCollectionByIdApi<collectionType>(
    collectionModel, 
    collectionName, 
    path, 
    query
  );

export const DELETE = async (
  _req: NextRequest, query: IQueryString
): Promise<NextResponse> => 
  await deleteCollectionByIdApi<collectionType>(
    collectionModel, 
    collectionName, 
    path, 
    query
  );
