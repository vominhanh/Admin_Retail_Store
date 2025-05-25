import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { NextRequest, NextResponse } from "next/server";
import { print } from "@/utils/print";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IAccount, IUser} from "@/interfaces";
import { UserModel } from "@/models/User";
import { isValidObjectId } from "mongoose";
import { AccountModel } from "@/models";
import { ROOT } from "@/constants/root.constant";

type collectionType = IUser;
const collectionName: ECollectionNames = ECollectionNames.USER;
const collectionModel = UserModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - POST ${collectionName}`, ETerminal.FgYellow );

  const user: collectionType = await req.json();

  try {
    connectToDatabase();

    if ( !isValidObjectId(user.account_id) )
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ID '${user.account_id}' is not valid.`,
          path, 
          `Please check if the ${ECollectionNames.ACCOUNT} ID is correct.`, 
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    const foundAccount: IAccount | null = 
      await AccountModel.findById(user.account_id);

    if (!foundAccount) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ${ECollectionNames.ACCOUNT} with the ID '${user.account_id}' does not exist in our records.`,
          path, 
          `Please check if the ${ECollectionNames.ACCOUNT} ID is correct.`
        ),          
        { status: EStatusCode.NOT_FOUND }
      );

    const otherUserAccounts = await collectionModel.find({
      account_id: user.account_id, 
    });

    if (otherUserAccounts.length > 0) 
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ${ECollectionNames.ACCOUNT} with the ID '${user.account_id}' is belonging to another user in out record.`,
          path, 
          `Please check if the ${ECollectionNames.ACCOUNT} ID is correct.`
        ),          
        { status: EStatusCode.CONFLICT }
      );

    const savedUser = await collectionModel.create({
      created_at: new Date(), 
      updated_at: new Date(), 
      account_id: user.account_id, 
      name: user.name, 
      address: user.address, 
      email: user.email, 
      birthday: user.birthday, 
      gender: user.gender, 
      avatar: user.avatar, 
    });

    if (!savedUser)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path, 
          `Please contact for more information.`, 
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(savedUser, { status: EStatusCode.CREATED });
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
