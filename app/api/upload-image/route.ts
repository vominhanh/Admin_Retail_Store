/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Parse CLOUDINARY_URL thủ công
const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (cloudinaryUrl) {
    const matches = cloudinaryUrl.match(
        /cloudinary:\/\/(\w+):(\w+)@(\w+)/
    );
    if (matches) {
        cloudinary.config({
            cloud_name: matches[3],
            api_key: matches[1],
            api_secret: matches[2],
        });
    }
}

export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Đọc file thành buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Lấy folder từ formData nếu có, mặc định là 'other'
    const folder = formData.get('folder')?.toString() || 'other';

    try {
        const uploadResult = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            ).end(buffer);
        });
        return NextResponse.json({ url: uploadResult.secure_url });
    } catch (error) {
        return NextResponse.json({ error: 'Upload failed', details: error }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 });

    // Lấy public_id từ url Cloudinary
    // Ví dụ: https://res.cloudinary.com/xxx/image/upload/v1710000000/product/abcxyz.jpg
    // public_id là: product/abcxyz
    const matches = url.match(/upload\/v\d+\/(.+)\.[a-zA-Z]+$/);
    const publicId = matches ? matches[1] : null;
    if (!publicId) return NextResponse.json({ error: 'Invalid url' }, { status: 400 });

    try {
        await cloudinary.uploader.destroy(publicId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed', details: error }, { status: 500 });
    }
} 