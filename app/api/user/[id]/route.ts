import { NextRequest, NextResponse } from "next/server";
import { print } from "@/utils/print";
import { deleteCollectionByIdApi, getCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IAccount, IUser } from "@/interfaces";
import { UserModel } from "@/models/User";
import { connectToDatabase } from "@/utils/database";
import { isValidObjectId } from "mongoose";
import { createErrorMessage } from "@/utils/create-error-message";
import { AccountModel } from "@/models";
import { ROOT } from "@/constants/root.constant";

type collectionType = IUser;
const collectionName: ECollectionNames = ECollectionNames.USER;
const collectionModel = UserModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/[id]`;

export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgMagenta);

  const user: collectionType = await req.json();

  try {
    connectToDatabase();

    const foundUser: collectionType | null =
      await collectionModel.findById(user._id);

    if (!foundUser)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `The ${collectionName} with the ID '${user._id}' does not exist in our records.`,
          path,
          `Please check if the ${collectionName} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    if (!isValidObjectId(user.account_id))
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
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
          `Failed to update ${collectionName}.`,
          `The ${ECollectionNames.ACCOUNT} with the ID '${user.account_id}' does not exist in our records.`,
          path,
          `Please check if the ${ECollectionNames.ACCOUNT} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    const updatedUser = await collectionModel.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          name: user.name,
          address: user.address,
          email: user.email,
          birthday: user.birthday,
          gender: user.gender,
          avatar: user.avatar ? user.avatar : ``,
          updated_at: new Date(),
        }
      },
      { new: true }
    );

    if (!updatedUser)
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    return NextResponse.json(updatedUser, { status: EStatusCode.CREATED });
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
