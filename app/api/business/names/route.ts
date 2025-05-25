import { ROOT } from "@/constants/root.constant";
import { ECollectionNames, EStatusCode, ETerminal } from "@/enums";
import { BusinessModel } from "@/models/Business";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { print } from "@/utils/print";
import { NextResponse } from "next/server";

// type collectionType = IBusiness;
const collectionName: ECollectionNames = ECollectionNames.BUSINESS;
const collectionModel = BusinessModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/names`;

export const GET = async (): Promise<NextResponse> => {
    print(`${collectionName} API - GET ${collectionName} Names`, ETerminal.FgGreen);

    try {
        connectToDatabase();

        // Chỉ lấy _id và name của nhà cung cấp
        const businessNames = await collectionModel.find({})
            .select('_id name')
            .lean();

        return NextResponse.json(businessNames, { status: EStatusCode.OK });
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            createErrorMessage(
                `Không thể lấy danh sách tên ${collectionName}.`,
                error as string,
                path,
                `Vui lòng liên hệ để được hỗ trợ.`,
            ),
            { status: EStatusCode.INTERNAL_SERVER_ERROR }
        );
    }
} 