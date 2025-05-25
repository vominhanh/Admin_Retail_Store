import { NextRequest, NextResponse } from 'next/server';
import { ProductDetailModel } from '@/models/ProductDetail';
import { connectToDatabase } from '@/utils/database';
import { ECollectionNames } from '@/enums';
import { createErrorMessage } from '@/utils/create-error-message';
import { EStatusCode } from '@/enums';
import { isValidObjectId } from 'mongoose';
import { ETerminal } from '@/enums';
import { print } from '@/utils/print';

const collectionName: ECollectionNames = ECollectionNames.PRODUCT_DETAIL;
const path: string = `/api/product-detail/by-product/[product_id]`;

export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ product_id: string }> }
): Promise<NextResponse> => {
    const resolvedParams = await params;
    const product_id = resolvedParams.product_id;

    print(`${collectionName} API - GET by product_id: ${product_id}`, ETerminal.FgMagenta);

    try {
        await connectToDatabase();

        if (!isValidObjectId(product_id)) {
            return NextResponse.json(
                createErrorMessage(
                    `Failed to get ${collectionName}.`,
                    `The product_id '${product_id}' is not valid.`,
                    path,
                    `Please check if the product_id is correct.`
                ),
                { status: EStatusCode.UNPROCESSABLE_ENTITY }
            );
        }

        const productDetails = await ProductDetailModel.find({ product_id: product_id });

        return NextResponse.json(productDetails, { status: EStatusCode.OK });
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            createErrorMessage(
                `Failed to get ${collectionName} by product_id.`,
                error as string,
                path,
                `Please contact for more information.`
            ),
            { status: EStatusCode.INTERNAL_SERVER_ERROR }
        );
    }
}; 