import { NextRequest, NextResponse } from "next/server";
import { deleteCollectionByIdApi, getCollectionByIdApi } from "@/utils/api-helper";
import { IQueryString } from "../../interfaces/query-string.interface";
import { ECollectionNames } from "@/enums";
import { ROOT } from "@/constants/root.constant";
import { IOrderForm } from "@/interfaces/order-form.interface";
import { OrderFormModel } from "@/models/OrderForm";
import { EStatusCode, ETerminal } from "@/enums";
import { IBusiness } from "@/interfaces/business.interface";
import { IOrderFormProductDetail, OrderFormStatus } from "@/interfaces/order-form.interface";
import { IProduct } from "@/interfaces/product.interface";
import { IUnit } from "@/interfaces/unit.interface";
import { BusinessModel } from "@/models/Business";
import { ProductModel } from "@/models/Product";
import { UnitModel } from "@/models/Unit";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { isIdsExist } from "@/utils/is-ids-exist";
import { isIdsValid } from "@/utils/is-ids-valid";
import { print } from "@/utils/print";
import { isValidObjectId } from "mongoose";

type collectionType = IOrderForm;
const collectionName: ECollectionNames = ECollectionNames.ORDER_FORM;
const collectionModel = OrderFormModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}`;

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  print(`${collectionName} API - PATCH ${collectionName}`, ETerminal.FgYellow);

  try {
    const orderForm: Partial<collectionType> = await req.json();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        createErrorMessage(
          `Failed to update ${collectionName}.`,
          `Invalid order form ID format.`,
          path,
          `Please check if the order form ID is correct.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
      );
    }

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

    console.log("PATCH orderForm id:", id);
    const existingOrderForm = await collectionModel.findById(id);
    console.log("Found orderForm:", existingOrderForm);
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

    // Chỉ cho phép cập nhật nếu phiếu chưa hoàn thành
    if (existingOrderForm.status === OrderFormStatus.COMPLETED) {
      return NextResponse.json(
        createErrorMessage(
          `Không thể cập nhật phiếu đã hoàn thành.`,
          `Chỉ có thể cập nhật phiếu đặt hàng chưa hoàn thành.`,
          path,
          `Vui lòng kiểm tra lại trạng thái phiếu đặt hàng.`,
        ),
        { status: EStatusCode.BAD_REQUEST }
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
}
