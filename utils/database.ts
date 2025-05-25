import mongoose from 'mongoose';

/**
 * Kết nối đến cơ sở dữ liệu MongoDB
 */
export const connectToDatabase = (() => {
    let isConnected = false;

    return async () => {
        if (isConnected) {
            console.log('Đã có kết nối MongoDB');
            return;
        }

        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('Vui lòng định nghĩa MONGODB_URI trong file .env');
        }

        try {
            await mongoose.connect(MONGODB_URI);

            isConnected = mongoose.connection.readyState === mongoose.ConnectionStates.connected;

            if (isConnected) {
                console.log('Đã kết nối thành công đến MongoDB');
            }
        } catch (error) {
            console.error('Lỗi kết nối đến MongoDB:', error);
            // Xử lý lỗi kết nối ở đây (ví dụ: thử lại sau một khoảng thời gian)
            throw error;
        }
    };
})();