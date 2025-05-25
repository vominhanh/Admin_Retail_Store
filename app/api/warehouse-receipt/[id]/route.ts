import { NextRequest, NextResponse } from "next/server";
import { deleteCollectionByIdApi, getCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames } from "@/enums";
import { ROOT } from "@/constants/root.constant";
import { IWarehouseReceipt } from "@/interfaces/warehouse-receipt.interface";
import { WarehouseReceiptModel } from "@/models/WarehouseReceipt";

type collectionType = IWarehouseReceipt;
const collectionName: ECollectionNames = ECollectionNames.WAREHOUSE_RECEIPT;
const collectionModel = WarehouseReceiptModel;
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
