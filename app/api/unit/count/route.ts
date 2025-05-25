import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IUnit } from "@/interfaces/unit.interface";
import { UnitModel } from "@/models/Unit";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { NextResponse } from "next/server";

type collectionType = IUnit;
const collectionName: ECollectionNames = ECollectionNames.UNIT;
const collectionModel = UnitModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/count`;

export const GET = async (): Promise<NextResponse> => {
  print(`${collectionName} API - GET ${collectionName}`, ETerminal.FgYellow );

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

  try {
    connectToDatabase();
    const collections: collectionType[] = await collectionModel.find({});

    return NextResponse.json(collections.length, { status: EStatusCode.OK });
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
