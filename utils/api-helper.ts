import { DeleteResult, isValidObjectId, Model } from "mongoose";
import { print } from "@/utils/print";
import { NextResponse } from "next/server";
import { createErrorMessage } from "./create-error-message";
import { ECollectionNames } from "@/enums/collection-names.enum";
import { EStatusCode } from "@/enums/status-code.enum";
import { EApiAction } from "@/app/api/enums/api-action.enum";
import { ETerminal } from "@/enums/terminal.enum";
import { connectToDatabase } from "./database";
import { IQueryString } from "@/app/api/interfaces/query-string.interface";
import { CONTACT_INFORMATION } from "@/constants";

const getCollections = async <T>(model: Model<T>): Promise<NextResponse> => {
  console.log(model)
  const collections: T[] = await model.find({});

  return NextResponse.json(collections, { status: EStatusCode.OK });
}

const deleteCollections = async <T>(model: Model<T>): Promise<NextResponse> => {
  const deleteCollectionsResult: DeleteResult = await model.deleteMany();

  if (deleteCollectionsResult.deletedCount === 0)
    return NextResponse.json(null, { status: EStatusCode.OK });

  return NextResponse.json([], { status: EStatusCode.OK });
}

const getCollectionById = async <T>(
  id: string,
  model: Model<T>,
  collectionName: ECollectionNames,
  path: string,
): Promise<NextResponse> => {
  if (!isValidObjectId(id))
    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.READ} ${collectionName} by ID ${id}.`,
        `The ID '${id}' is not valid.`,
        path,
        `Please check if the ${collectionName} ID is valid.`,
      ),
      { status: EStatusCode.UNPROCESSABLE_ENTITY }
    );

  const foundCollection: any = await model.findById(id).lean();

  if (!foundCollection)
    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.READ} ${collectionName} by ID ${id}.`,
        `The ${collectionName} with the ID '${id}' does not exist in our records.`,
        path,
        `Please check if the ${collectionName} ID is correct.`,
      ),
      { status: EStatusCode.NOT_FOUND }
    );

  return NextResponse.json(foundCollection, { status: EStatusCode.OK });
}

const deleteCollectionById = async <T>(
  id: string,
  model: Model<T>,
  collectionName: ECollectionNames,
  path: string,
): Promise<NextResponse> => {
  if (!isValidObjectId(id))
    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.DELETE} ${collectionName} by ID ${id}.`,
        `The ID '${id}' is not valid.`,
        path,
        `Please check if the ${collectionName} ID is valid.`,
      ),
      { status: EStatusCode.UNPROCESSABLE_ENTITY }
    );

  const foundCollection: any = await model.findById(id);

  if (!foundCollection)
    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.DELETE} ${collectionName} by ID ${id}.`,
        `The ${collectionName} with the ID '${id}' does not exist in our records.`,
        path,
        `Please check if the ${collectionName} ID is correct.`,
      ),
      { status: EStatusCode.NOT_FOUND }
    );

  const deleteCollectionResult: DeleteResult | null =
    await model.findByIdAndDelete(id);

  if (!deleteCollectionResult)
    return NextResponse.json(null, { status: EStatusCode.OK });

  return NextResponse.json(deleteCollectionResult, { status: EStatusCode.OK });
}

const getCollectionsApi = async <T>(
  collectionName: ECollectionNames,
  model: Model<T>,
  path: string,
): Promise<NextResponse> => {
  print(`${collectionName} API - GET ${collectionName}s`, ETerminal.FgGreen);
  console.log(collectionName, model, path);
  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.READ, 
  //   collectionName, 
  // );

  // if ( !isUserAdmin )
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to ${EApiAction.READ} ${collectionName}.`,
  //       `You dont have privilage to do this action.`,
  //       path, 
  //       `Please check if the account had privilage to do this action.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  try {
    // Kết nối đến database
    const dbConnectStart = Date.now();
    print(`${collectionName} API - Đang kết nối đến database...`, ETerminal.FgYellow);

    await connectToDatabase();

    const dbConnectTime = Date.now() - dbConnectStart;
    print(`${collectionName} API - Đã kết nối đến database sau ${dbConnectTime}ms`, ETerminal.FgGreen);

    // Đo thời gian truy vấn
    const queryStart = Date.now();
    print(`${collectionName} API - Đang truy vấn dữ liệu...`, ETerminal.FgYellow);

    // Gia tăng thời gian timeout
    const queryTimeoutMs = 30000; // 30 giây

    // Đảm bảo truy vấn không bị timeout bằng cách tối ưu hóa query
    try {
      // Đếm số lượng bản ghi
      const count = await model.countDocuments({});
      print(`${collectionName} API - Tổng số ${count} bản ghi`, ETerminal.FgGreen);

      // Giới hạn số lượng bản ghi trả về nếu quá nhiều
      const limit = count > 1000 ? 1000 : count;

      // Sử dụng các tùy chọn tối ưu hóa
      const collections = await model.find({})
        .lean()
        .sort({ created_at: -1 })
        .limit(limit)
        .maxTimeMS(queryTimeoutMs); // Đặt timeout tối đa cho query MongoDB

      const queryTime = Date.now() - queryStart;
      print(`${collectionName} API - Đã truy vấn xong ${collections.length} bản ghi sau ${queryTime}ms`, ETerminal.FgGreen);

      // const totalTime = Date.now() - startTime;
      const totalTime = Date.now() - 0;
      print(`${collectionName} API - Hoàn thành sau ${totalTime}ms`, ETerminal.FgGreen);

      return NextResponse.json(collections, {
        status: EStatusCode.OK,
        headers: {
          'X-Processing-Time': `${totalTime}ms`,
          'X-Total-Count': String(collections.length),
          'X-Complete': String(collections.length >= count)
        }
      });
    } catch (queryError) {
      console.error(`Query error:`, queryError);
      throw new Error(`Truy vấn dữ liệu quá thời gian: ${queryError}`);
    }
  } catch (error: unknown) {
    // const errorTime = Date.now() - startTime;
    const errorTime = Date.now() - 0;
    console.error(`${collectionName} API - Lỗi sau ${errorTime}ms:`, error);

    if (error instanceof Error) {
      print(`${collectionName} API - Lỗi: ${error.message}`, ETerminal.FgRed);
    }

    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.READ} ${collectionName}s.`,
        error instanceof Error ? error.message : String(error),
        path,
        `${CONTACT_INFORMATION} - Lỗi xảy ra sau ${errorTime}ms`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

const deleteCollectionsApi = async <T>(
  collectionName: ECollectionNames,
  model: Model<T>,
  path: string,
): Promise<NextResponse> => {
  print(`${collectionName} API - DELETE ${collectionName}s`, ETerminal.FgRed);

  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.DELETE, 
  //   collectionName
  // );

  // if ( !isUserAdmin )
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to ${EApiAction.DELETE} ${collectionName}.`,
  //       `You dont have privilage to do this action.`,
  //       path, 
  //       `Please check if the account had privilage to do this action.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  try {
    connectToDatabase();

    return await deleteCollections<T>(model);
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.DELETE} ${collectionName}s.`,
        error as string,
        path,
        CONTACT_INFORMATION,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

const getCollectionByIdApi = async <T>(
  model: Model<T>,
  collectionName: ECollectionNames,
  path: string,
  query: IQueryString,
): Promise<NextResponse> => {
  print(`${collectionName} API - GET ${collectionName} by ID`,
    ETerminal.FgGreen,
  );

  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.CREATE, 
  //   collectionName
  // );
  // if ( !isUserAdmin )
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to ${EApiAction.READ} ${collectionName}.`,
  //       `You dont have privilage to do this action.`,
  //       path, 
  //       `Please check if the account had privilage to do this action.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  const params = await query.params;
  const id = params.id;

  try {
    connectToDatabase();

    return await getCollectionById<T>(id, model, collectionName, path);
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.READ} ${collectionName} by ID ${id}.`,
        error as string,
        path,
        CONTACT_INFORMATION,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

const deleteCollectionByIdApi = async <T>(
  model: Model<T>,
  collectionName: ECollectionNames,
  path: string,
  query: IQueryString,
): Promise<NextResponse> => {
  print(`${collectionName} API - DELETE ${collectionName} by ID`,
    ETerminal.FgRed,
  );

  // const cookieStore: ReadonlyRequestCookies = await cookies();
  // const isUserAdmin = await isAdmin(
  //   cookieStore, 
  //   ERoleAction.DELETE, 
  //   collectionName, 
  // );

  // if ( !isUserAdmin )
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to ${EApiAction.DELETE} ${collectionName}.`,
  //       `You dont have privilage to do this action.`,
  //       path, 
  //       `Please check if the account had privilage to do this action.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  const params = await query.params;
  const id = params.id;

  try {
    connectToDatabase();

    return await deleteCollectionById<T>(id, model, collectionName, path);
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to ${EApiAction.DELETE} ${collectionName} by ID ${id}.`,
        error as string,
        path,
        CONTACT_INFORMATION,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

export {
  getCollections,
  deleteCollections,
  getCollectionById,
  deleteCollectionById,
  getCollectionsApi,
  deleteCollectionsApi,
  getCollectionByIdApi,
  deleteCollectionByIdApi,
}
