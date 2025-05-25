import { NextRequest, NextResponse } from "next/server";
import { deleteCollectionByIdApi, getCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { print } from "@/utils/print";
import { connectToDatabase } from "@/utils/database";
import { createErrorMessage } from "@/utils/create-error-message";
import { ROOT } from "@/constants/root.constant";
import { IBusiness } from "@/interfaces/business.interface";
import { BusinessModel } from "@/models/Business";

type collectionType = IBusiness;
const collectionName: ECollectionNames = ECollectionNames.BUSINESS;
const collectionModel = BusinessModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/[id]`;

export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgMagenta);

  const body = await req.json();
  const id = (await params).id;

  try {
    connectToDatabase();

    const foundBusiness: collectionType | null =
      await collectionModel.findById(id);

    if (!foundBusiness)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `The ${collectionName} with the ID '${id}' does not exist in our records.`,
          path,
          `Please check if the ${collectionName} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    const updatedBusiness = await collectionModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          name: body.name,
          logo: body.logo ? body.logo : ``,
          logo_links: body.logo_links || [],
          address: body.address,
          email: body.email,
          updated_at: new Date(),
          phone: body.phone,
        }
      },
      { new: true }
    );

    if (!updatedBusiness)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(updatedBusiness, { status: EStatusCode.CREATED });
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
