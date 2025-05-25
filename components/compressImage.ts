// compressImage.ts
// Hàm nén ảnh tự động trên trình duyệt, trả về file mới đã nén
export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> {
    return new Promise((resolve) => {
        const img = new window.Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                if (width > height) {
                    height = Math.round((height *= maxWidth / width));
                    width = maxWidth;
                } else {
                    width = Math.round((width *= maxHeight / height));
                    height = maxHeight;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return resolve(file);
                    const compressedFile = new File([blob], file.name, { type: file.type });
                    resolve(compressedFile);
                },
                file.type,
                quality
            );
        };
        reader.readAsDataURL(file);
    });
} 