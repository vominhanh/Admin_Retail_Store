import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { ProductModel } from "@/models";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

// type collectionType = IProduct;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT;
const collectionModel = ProductModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/supplier/[id]`;

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    const supplierId = (await params).id;
    print(`${collectionName} API - GET ${collectionName} by Supplier ID: ${supplierId}`, ETerminal.FgGreen);

    try {
        await connectToDatabase();

        if (!isValidObjectId(supplierId)) {
            return NextResponse.json(
                createErrorMessage(
                    `Không thể lấy ${collectionName} theo nhà cung cấp.`,
                    `ID '${supplierId}' không hợp lệ.`,
                    path,
                    `Vui lòng kiểm tra lại ID nhà cung cấp.`,
                ),
                { status: EStatusCode.UNPROCESSABLE_ENTITY }
            );
        }

        // Lấy sản phẩm theo supplier_id
        const products = await collectionModel.find({ supplier_id: supplierId }).lean();

        return NextResponse.json(products, { status: EStatusCode.OK });
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            createErrorMessage(
                `Không thể lấy ${collectionName} theo nhà cung cấp.`,
                error as string,
                path,
                `Vui lòng liên hệ để được hỗ trợ.`,
            ),
            { status: EStatusCode.INTERNAL_SERVER_ERROR }
        );
    }
} 