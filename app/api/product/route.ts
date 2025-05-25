import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IProduct } from "@/interfaces/product.interface";
import { ProductModel } from "@/models";
import { deleteCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { nameToHyphenAndLowercase } from "@/utils/name-to-hyphen-and-lowercase";
import { print } from "@/utils/print";
import { NextRequest, NextResponse } from "next/server";

type collectionType = IProduct;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT;
const collectionModel = ProductModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

// Cache kết quả API trong 5 phút (300000ms)
const CACHE_DURATION = 0;
let cachedProducts: { data: IProduct[]; timestamp: number } | null = null;

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

  const product: collectionType = await req.json();
  console.log(product)

  try {
    await connectToDatabase();

    // Đảm bảo có code hợp lệ và độc nhất
    if (!product.code || product.code.trim() === '') {
      // Tạo mã sản phẩm với format: SP-[ngày hiện tại dạng ddMMyyyy]-[timestamp]
      const timestamp = Date.now();
      product.code = `SP-${timestamp}`;
    } else {
      // Đảm bảo code không có dấu tiếng Việt
      product.code = nameToHyphenAndLowercase(product.code);
    }

    // Kiểm tra xem code đã tồn tại chưa
    const existingProduct = await collectionModel.findOne({ code: product.code });
    if (existingProduct) {
      // Nếu đã tồn tại, tạo mã mới với timestamp mới
      const parts = product.code.split('-');
      const prefix = parts[0];
      const dateCode = parts[1];
      const timestamp = Date.now();
      product.code = `${prefix}-${dateCode}-${timestamp}`;
    }

    const newProduct = new collectionModel({
      created_at: new Date(),
      updated_at: new Date(),
      supplier_id: product.supplier_id,
      category_id: product.category_id,
      name: product.name,
      code: product.code,
      description: product.description,
      image_links: product.image_links,
      input_price: product.input_price,
      output_price: product.output_price,
    });
    console.log('new Product', newProduct)

    const savedProduct: collectionType = await newProduct.save();
    console.log('save Product', savedProduct)

    if (!savedProduct)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    // Khi tạo mới sản phẩm, cần vô hiệu hóa cache để lần tải tiếp theo sẽ lấy dữ liệu mới nhất
    cachedProducts = null;

    return NextResponse.json(savedProduct, { status: EStatusCode.CREATED });
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
};

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  print(`${collectionName} API - GET ${collectionName}s`, ETerminal.FgGreen);

  // Kiểm tra cache - nếu có dữ liệu trong cache và cache chưa hết hạn, trả về dữ liệu từ cache
  const now = Date.now();
  if (cachedProducts && now - cachedProducts.timestamp < CACHE_DURATION) {
    console.log(`${collectionName} API - Serving from cache`);
    return NextResponse.json(cachedProducts.data, {
      status: EStatusCode.OK,
      headers: {
        'Cache-Control': 'public, max-age=0', // Cache 5 phút ở client
        'X-Cached-Response': 'true'
      }
    });
  }

  try {
    // Kết nối đến database
    await connectToDatabase();

    // Phân tích URL để lấy các query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100'); // Mặc định lấy tối đa 1000 sản phẩm
    const fields = url.searchParams.get('fields'); // Cho phép chỉ định các trường cần lấy

    // Xây dựng projection để chỉ lấy các trường cần thiết
    let projection = {};
    if (fields) {
      projection = fields.split(',').reduce((acc, field) => ({
        ...acc,
        [field.trim()]: 1
      }), {});
    } else {
      // Mặc định chỉ lấy các trường cần thiết cho danh sách sản phẩm
      projection = {
        _id: 1,
        code: 1,
        name: 1,
        description: 1,
        image_links: 1,
        input_price: 1,
        output_price: 1,
        business_id: 1,
        supplier_id: 1,
        created_at: 1,
        updated_at: 1,
        category_id: 1,
      };
    }

    // Query với projection và giới hạn số lượng
    const products = await collectionModel
      .find({}, projection)
      .limit(limit)
      .lean<IProduct[]>() // Chuyển kết quả sang plain JavaScript objects với kiểu IProduct
      .exec();

    // Lưu kết quả vào cache
    cachedProducts = { data: products as IProduct[], timestamp: now };

    // Trả về kết quả với Cache-Control header
    return NextResponse.json(products, {
      status: EStatusCode.OK,
      headers: {
        'Cache-Control': 'public, max-age=0', // Cache 5 phút ở client
        'X-Cached-Response': 'false'
      }
    });
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to get ${collectionName}s.`,
        error as string,
        path,
        `Please contact for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};

export const DELETE = async (): Promise<NextResponse> => {
  // Vô hiệu hóa cache khi xóa sản phẩm
  cachedProducts = null;
  return await deleteCollectionsApi<collectionType>(
    collectionName,
    collectionModel,
    path
  );
};
