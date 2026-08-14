import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { IBusiness } from "@/interfaces/business.interface";
import { IOrderForm, IOrderFormProductDetail, OrderFormStatus } from "@/interfaces/order-form.interface";
import { IProduct } from "@/interfaces/product.interface";
import { IUnit } from "@/interfaces/unit.interface";
import { BusinessModel } from "@/models/Business";
import { OrderFormModel } from "@/models/OrderForm";
import { ProductModel } from "@/models/Product";
import { UnitModel } from "@/models/Unit";
import { deleteCollectionsApi, getCollectionsApi } from "@/utils/api-helper";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { isIdsExist } from "@/utils/is-ids-exist";
import { isIdsValid } from "@/utils/is-ids-valid";
import { print } from "@/utils/print";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type collectionType = IOrderForm;
const collectionName: ECollectionNames = ECollectionNames.ORDER_FORM;
const collectionModel = OrderFormModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

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
    const orderForm: collectionType = await req.json();

    // Log để debug dữ liệu nhận được
    console.log("Received order form data:", JSON.stringify({
      supplier_id: orderForm.supplier_id,
      product_details_count: orderForm.product_details?.length || 0,
    }));

    if (!orderForm.product_details || orderForm.product_details.length === 0) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Order form must have at least one product.`,
          path,
          `Please add products to the order form.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
      );
    }

    connectToDatabase();

    if (!isValidObjectId(orderForm.supplier_id))
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The supplier ID is not valid.`,
          path,
          `Please check if the ${ECollectionNames.BUSINESS} ID is correct.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    const foundSupplier: IBusiness | null =
      await BusinessModel.findById(orderForm.supplier_id);

    if (!foundSupplier)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `The ${ECollectionNames.BUSINESS} with the ID '${orderForm.supplier_id}' does not exist in our records.`,
          path,
          `Please check if the ${ECollectionNames.BUSINESS} ID is correct.`
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    // Kiểm tra nếu có sản phẩm nào với giá nhập hoặc số lượng không hợp lệ
    const productsWithIssues = orderForm.product_details.filter(
      product => !product.input_price || product.input_price <= 0 || !product.quantity || product.quantity <= 0
    );

    if (productsWithIssues.length > 0) {
      // Tìm các sản phẩm có giá = 0 để thông báo cụ thể
      const productsWithZeroPrice = productsWithIssues.filter(product => product.input_price === 0);

      if (productsWithZeroPrice.length > 0) {
        // Lấy ID sản phẩm đầu tiên có giá = 0 để thông báo
        const productId = productsWithZeroPrice[0]._id;

        return NextResponse.json(
          createErrorMessage(
            `Failed to create ${collectionName}.`,
            `Sản phẩm có giá nhập bằng 0.`,
            path,
            `Vui lòng nhập giá cho tất cả sản phẩm trong phiếu đặt hàng.`,
          ),
          { status: EStatusCode.BAD_REQUEST }
        );
      }

      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some products have invalid input price or quantity.`,
          path,
          `Please ensure all products have input price and quantity greater than 0.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
      );
    }

    const orderFormProductIds: string[] =
      orderForm.product_details.map(
        (orderFormProductDetail: IOrderFormProductDetail): string =>
          orderFormProductDetail._id
      );

    if (!isIdsValid(orderFormProductIds))
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.PRODUCT} in order form's product details is not valid.`,
          path,
          `Please check if the ${ECollectionNames.PRODUCT} ID is correct.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    console.log("Validating product IDs:", orderFormProductIds);

    const isProductIdsExist: boolean = await isIdsExist<IProduct>(
      orderFormProductIds,
      ProductModel
    );

    if (!isProductIdsExist)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.PRODUCT} in order form's product details does not exist in our records.`,
          path,
          `Please check if the ${ECollectionNames.PRODUCT} ID is correct.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    const orderFormProductDetailUnitIds: string[] =
      orderForm.product_details.map(
        (orderFormProductDetail: IOrderFormProductDetail): string =>
          orderFormProductDetail.unit_id
      );

    if (!isIdsValid(orderFormProductDetailUnitIds))
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.UNIT} in order form's product details is not valid.`,
          path,
          `Please check if the ${ECollectionNames.UNIT} ID is correct.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );

    console.log("Validating unit IDs:", orderFormProductDetailUnitIds);

    const isProductDetailUnitIdsExist: boolean = await isIdsExist<IUnit>(
      orderFormProductDetailUnitIds,
      UnitModel
    );

    if (!isProductDetailUnitIdsExist)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          `Some of the ${ECollectionNames.UNIT} in order form's product details does not exist in our records.`,
          path,
          `Please check if the ${ECollectionNames.UNIT} ID is correct.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );

    console.log("Creating new order form...");

    const newOrderForm = new collectionModel({
      created_at: new Date(),
      updated_at: new Date(),
      supplier_id: orderForm.supplier_id,
      status: OrderFormStatus.PENDING,
      product_details: orderForm.product_details,
    });

    console.log("Saving order form to database...");

    const savedOrderForm: collectionType = await newOrderForm.save();

    if (!savedOrderForm)
      return NextResponse.json(
        createErrorMessage(
          `Failed to create ${collectionName}.`,
          ``,
          path,
          `Please contact for more information.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );

    console.log("Order form saved successfully with ID:", savedOrderForm._id);

    return NextResponse.json(savedOrderForm, { status: EStatusCode.CREATED });
  } catch (error: unknown) {
    console.error(`Error creating ${collectionName}:`, error);

    return NextResponse.json(
      createErrorMessage(
        `Failed to create ${collectionName}.`,
        error instanceof Error ? error.message : String(error),
        path,
        `Please contact administrator for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = async (req: NextRequest): Promise<NextResponse> => {
  await connectToDatabase();
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (date && date !== '0') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date === '1') {
        filter.created_at = { $gte: today };
      } else if (date === '7') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filter.created_at = { $gte: sevenDaysAgo };
      } else if (date === '30') {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filter.created_at = { $gte: firstDayOfMonth };
      } else if (date === '60') {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        filter.created_at = { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth };
      }
    }
    const orders = await OrderFormModel.find(filter).sort({ created_at: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching order forms', error }, { status: 500 });
  }
};

export const DELETE = async (): Promise<NextResponse> =>
  await deleteCollectionsApi<collectionType>(
    collectionName,
    collectionModel,
    path
  );

export const PATCH = async (
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> => {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgYellow);

  try {
    const orderForm: Partial<collectionType> = await req.json();
    const id = params.id;

    if (!orderForm.product_details || orderForm.product_details.length === 0) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Order form must have at least one product.`,
          path,
          `Please add products to the order form.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
      );
    }

    await connectToDatabase();

    // Kiểm tra phiếu đặt hàng tồn tại
    const existingOrderForm = await collectionModel.findById(id);
    if (!existingOrderForm) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `The order form with ID '${id}' does not exist.`,
          path,
          `Please check if the order form ID is correct.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );
    }

    // Kiểm tra giá và số lượng sản phẩm
    const productsWithIssues = orderForm.product_details.filter(
      product => !product.input_price || product.input_price <= 0 || !product.quantity || product.quantity <= 0
    );

    if (productsWithIssues.length > 0) {
      const productsWithZeroPrice = productsWithIssues.filter(product => product.input_price === 0);
      if (productsWithZeroPrice.length > 0) {
        return NextResponse.json(
          createErrorMessage(
            `Failed to update ${collectionName}.`,
            `Sản phẩm có giá nhập bằng 0.`,
            path,
            `Vui lòng nhập giá cho tất cả sản phẩm trong phiếu đặt hàng.`,
          ),
          { status: EStatusCode.BAD_REQUEST }
        );
      }
    }

    // Kiểm tra ID sản phẩm hợp lệ
    const productIds = orderForm.product_details.map(detail => detail._id);
    if (!isIdsValid(productIds)) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Some product IDs are invalid.`,
          path,
          `Please check product IDs.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );
    }

    // Kiểm tra sản phẩm tồn tại
    const isProductsExist = await isIdsExist<IProduct>(productIds, ProductModel);
    if (!isProductsExist) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Some products do not exist.`,
          path,
          `Please check if all products exist.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );
    }

    // Kiểm tra đơn vị tính
    const unitIds = orderForm.product_details.map(detail => detail.unit_id);
    if (!isIdsValid(unitIds)) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Some unit IDs are invalid.`,
          path,
          `Please check unit IDs.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );
    }

    const isUnitsExist = await isIdsExist<IUnit>(unitIds, UnitModel);
    if (!isUnitsExist) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Some units do not exist.`,
          path,
          `Please check if all units exist.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );
    }

    // Cập nhật phiếu đặt hàng
    const updatedOrderForm = await collectionModel.findByIdAndUpdate(
      id,
      {
        ...orderForm,
        updated_at: new Date(),
      },
      { new: true }
    );

    if (!updatedOrderForm) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Could not update the order form.`,
          path,
          `Please try again later.`,
        ),
        { status: EStatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(updatedOrderForm, { status: EStatusCode.OK });
  } catch (error: unknown) {
    console.error(`Error updating ${collectionName}:`, error);
    return NextResponse.json(
      createErrorMessage(
        `Failed to update ${collectionName}.`,
        error instanceof Error ? error.message : String(error),
        path,
        `Please contact administrator for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
};
