import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IBusiness } from "@/interfaces/business.interface";
import { BusinessModel } from "@/models/Business";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { NextRequest, NextResponse } from "next/server";

type collectionType = IBusiness;
const collectionName: ECollectionNames = ECollectionNames.BUSINESS;
const collectionModel = BusinessModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

// Cache settings
// const CACHE_DURATION = 5 * 60 * 1000; // 5 phút (ms)
// let cachedBusinesses: { data: IBusiness[]; timestamp: number; } | null = null;

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

  try {
    const business: collectionType = await req.json();

    // Log dữ liệu nhận được
    console.log('Received business data:', business);

    // Validate dữ liệu đầu vào
    const name = business?.name?.trim();
    const address = business?.address?.trim();

    if (!name || !address) {
      return NextResponse.json(
        createErrorMessage(
          `Thiếu thông tin bắt buộc.`,
          `Vui lòng nhập đầy đủ tên doanh nghiệp và địa chỉ.`,
          path,
          `Kiểm tra lại dữ liệu gửi lên từ client.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
      );
    }

    await connectToDatabase();

    const newBusiness = new collectionModel({
      created_at: new Date(),
      updated_at: new Date(),
      name: name,
      address: address,
      email: business.email?.trim(),
      logo: business.logo,
      logo_links: business.logo ? [business.logo] : [],
      phone: business.phone,
    });

    const savedBusiness: collectionType = await newBusiness.save();

    if (!savedBusiness) {
      throw new Error('Không thể lưu doanh nghiệp');
    }

    return NextResponse.json(savedBusiness, { status: EStatusCode.CREATED });
  } catch (error: unknown) {
    console.error('Server error:', error);

    return NextResponse.json(
      createErrorMessage(
        `Lỗi khi tạo ${collectionName}.`,
        error instanceof Error ? error.message : 'Unknown error',
        path,
        `Vui lòng liên hệ admin để được hỗ trợ.`,
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
