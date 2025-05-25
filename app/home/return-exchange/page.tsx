/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useState } from 'react';
import { ECollectionNames } from '@/enums/collection-names.enum';
import { IReturnExchange, IReturnExchangeRequest, IReturnExchangeResponse } from '@/interfaces';

// Thêm PRODUCT_DETAIL vào enum nếu chưa có
// Có thể cần thêm vào file enums/collection-names.enum.ts
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import CustomNotification, { ENotificationType } from '@/components/notify/notification/notification';

interface IOrderDetail {
    _id: string;
    product_id: string;
    quantity: number;
    price: number;
    product_name?: string;
}

interface IOrder {
    _id: string;
    order_code: string;
    created_at: string;
    updated_at: string;
    total_amount: number;
    customer_id?: string;
    prodetail: IOrderDetail[];
}

interface IProduct {
    _id: string;
    name: string;
    price: number;
    inventory?: number;
    image_url?: string;
    exp_date?: string; // Hạn sử dụng
}

interface IProductDetail {
    _id: string;
    product_id: string;
    product_name?: string;
    price: number;
    expiry_date?: string; // Hạn sử dụng
    quantity: number;
    inventory?: number; // Tồn kho
}

interface IUnit {
    _id: string;
    name: string;
    equal: number;
    created_at: Date;
    updated_at: Date;
}

const STATUS = {
    PENDING: 'Chờ xử lý',
    EXCHANGING: 'Đang đổi hàng',
    COMPLETED: 'Hoàn thành',
};

// Modal đổi sản phẩm
function ExchangeProductModal({
    open,
    onClose,
    onSubmit,
    products,
    productDetails,
    exchangeInfo
}: {
    open: boolean,
    onClose: () => void,
    onSubmit: (data: { newProductId: string, quantity: number, unit: string, unitRatio: number }) => void,
    products: IProduct[],
    productDetails: IProductDetail[],
    exchangeInfo: { productId: string, price: number } | null
}) {
    const [newProductId, setNewProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [currentProduct, setCurrentProduct] = useState<IProduct | null>(null);
    const [newProductPrice, setNewProductPrice] = useState(0);
    const [difference, setDifference] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<IProductDetail[]>([]);
    const [unit, setUnit] = useState('cái');
    const [unitRatio, setUnitRatio] = useState(1);
    const [units, setUnits] = useState<IUnit[]>([]);
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);

    // Lấy danh sách đơn vị tính từ API
    useEffect(() => {
        const fetchUnits = async () => {
            setIsLoadingUnits(true);
            try {
                const unitsData = await fetchGetCollections<IUnit>(ECollectionNames.UNIT);
                // Mặc định có đơn vị cái nếu không có trong database
                if (unitsData.length === 0) {
                    setUnits([
                        { _id: 'default', name: 'cái', equal: 1, created_at: new Date(), updated_at: new Date() }
                    ]);
                } else {
                    setUnits(unitsData);
                }
                console.log('Đã lấy danh sách đơn vị tính:', unitsData);
            } catch (error) {
                console.error('Lỗi khi lấy danh sách đơn vị tính:', error);
                // Sử dụng đơn vị mặc định
                setUnits([
                    { _id: 'default', name: 'cái', equal: 1, created_at: new Date(), updated_at: new Date() }
                ]);
            } finally {
                setIsLoadingUnits(false);
            }
        };

        fetchUnits();
    }, []);

    useEffect(() => {
        if (open && exchangeInfo && productDetails.length > 0) {
            // Reset các giá trị
            setNewProductId('');
            setQuantity(1);
            setCurrentProduct(null);
            setNewProductPrice(0);
            setDifference(-exchangeInfo.price);
            setSearchTerm('');
            setUnit('cái');
            setUnitRatio(1);

            // Lọc danh sách sản phẩm có tồn kho > 0
            const validProducts = productDetails.filter(p =>
                p.inventory === undefined || p.inventory > 0
            );

            console.log("Danh sách sản phẩm hợp lệ:", validProducts.length);

            // Hiển thị tất cả chi tiết sản phẩm hợp lệ
            setFilteredProducts(validProducts);
        }
    }, [open, exchangeInfo, productDetails]);

    // Cập nhật thông tin sản phẩm khi id thay đổi
    useEffect(() => {
        if (newProductId && productDetails.length > 0) {
            const productDetail = productDetails.find(p => p._id === newProductId);
            console.log("Chi tiết sản phẩm được chọn:", productDetail);

            if (productDetail) {
                // Tìm thông tin sản phẩm gốc nếu cần
                const product = products.find(p => p._id === productDetail.product_id);

                // Sử dụng chi tiết sản phẩm nhưng kết hợp với thông tin sản phẩm gốc nếu cần
                const newCurrentProduct = {
                    _id: productDetail._id,
                    product_id: productDetail.product_id,
                    name: productDetail.product_name || (product ? product.name : ""),
                    price: productDetail.price,
                    inventory: productDetail.inventory, // Lấy trường inventory làm tồn kho
                    image_url: product?.image_url,
                    exp_date: productDetail.expiry_date
                };

                console.log("Cập nhật currentProduct:", newCurrentProduct);
                setCurrentProduct(newCurrentProduct);

                // Đảm bảo đã lấy đúng giá
                const productPrice = productDetail.price || 0;
                console.log("Giá sản phẩm:", productPrice);
                setNewProductPrice(productPrice);

                if (exchangeInfo) {
                    updateDifference(productPrice, quantity, unitRatio, exchangeInfo.price);
                }
            } else {
                console.error("Không tìm thấy chi tiết sản phẩm cho ID:", newProductId);
                // Reset thông tin sản phẩm nếu không tìm thấy chi tiết
                setCurrentProduct(null);
                setNewProductPrice(0);
                if (exchangeInfo) {
                    updateDifference(0, quantity, unitRatio, exchangeInfo.price);
                }
            }
        }
    }, [newProductId, quantity, unitRatio, productDetails, products, exchangeInfo]);

    // Cập nhật chênh lệch giá khi thay đổi số lượng hoặc đơn vị tính
    const updateDifference = (price: number, qty: number, ratio: number, exchangeValue: number) => {
        // Thành tiền sản phẩm mới
        const newTotal = price * qty * ratio;
        // Chênh lệch = thành tiền mới - giá trị sản phẩm cũ
        const priceDiff = newTotal - exchangeValue;
        setDifference(priceDiff);
    };

    // Lọc sản phẩm theo từ khoá tìm kiếm (tên hoặc barcode)
    useEffect(() => {
        if (productDetails.length > 0 && exchangeInfo) {
            const keyword = searchTerm.toLowerCase();
            const filtered = productDetails.filter(p =>
                (p.product_name?.toLowerCase().includes(keyword)) ||
                ((p as any).batch_number && (p as any).batch_number.toLowerCase().includes(keyword))
            );
            setFilteredProducts(filtered);

            // Nếu chỉ còn 1 sản phẩm, tự động hiển thị thông tin sản phẩm đó
            if (filtered.length === 1) {
                const p = filtered[0];
                const product = products.find(prod => String(prod._id) === String(p.product_id));
                // Ưu tiên lấy tên và giá từ product_detail, nếu không có thì lấy từ products
                const name = p.product_name || (product ? product.name : "Sản phẩm không tên");
                const price = p.price || (product ? product.price : 0);
                const newCurrentProduct = {
                    _id: p._id,
                    product_id: p.product_id,
                    name,
                    price,
                    inventory: p.inventory,
                    image_url: product?.image_url,
                    exp_date: p.expiry_date
                };
                setNewProductId(p._id);
                setCurrentProduct(newCurrentProduct);
                setNewProductPrice(price);
                if (exchangeInfo) {
                    updateDifference(price, quantity, unitRatio, exchangeInfo.price);
                }
            } else if (filtered.length === 0 || searchTerm === '') {
                setNewProductId('');
                setCurrentProduct(null);
                setNewProductPrice(0);
                setDifference(-exchangeInfo.price);
            }
        }
    }, [searchTerm, productDetails, exchangeInfo]);

    if (!open || !exchangeInfo) return null;

    // Log danh sách sản phẩm để debug
    console.log("Danh sách sản phẩm:", products);
    console.log("Giá trị exchangeInfo:", exchangeInfo);

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        console.log("Đã chọn sản phẩm id:", selectedId);
        setNewProductId(selectedId);

        // Cập nhật thông tin sản phẩm ngay lập tức
        if (selectedId) {
            // Tìm thông tin chi tiết sản phẩm (productDetails) thay vì products
            const selectedProductDetail = productDetails.find(p => p._id === selectedId);
            console.log("Thông tin chi tiết sản phẩm được chọn:", selectedProductDetail);

            if (selectedProductDetail) {
                // Tìm thông tin sản phẩm gốc từ product_id
                const originalProduct = products.find(p => p._id === selectedProductDetail.product_id);

                // Tạo đối tượng currentProduct từ thông tin kết hợp
                const newCurrentProduct = {
                    _id: selectedProductDetail._id,
                    product_id: selectedProductDetail.product_id,
                    name: selectedProductDetail.product_name || (originalProduct ? originalProduct.name : "Sản phẩm không tên"),
                    price: selectedProductDetail.price,
                    inventory: selectedProductDetail.inventory,
                    image_url: originalProduct?.image_url,
                    exp_date: selectedProductDetail.expiry_date
                };

                console.log("Đã tạo currentProduct:", newCurrentProduct);
                setCurrentProduct(newCurrentProduct);

                const price = selectedProductDetail.price || 0;
                console.log("Giá sản phẩm đã chọn:", price);
                setNewProductPrice(price);

                if (exchangeInfo) {
                    updateDifference(price, quantity, unitRatio, exchangeInfo.price);
                }
            } else {
                console.error("Không tìm thấy thông tin chi tiết sản phẩm cho ID:", selectedId);
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedUnitValue = e.target.value;
        setUnit(selectedUnitValue);

        // Tìm đơn vị và lấy hệ số quy đổi
        const selectedUnit = units.find(u => u.name === selectedUnitValue);
        const newRatio = selectedUnit ? selectedUnit.equal : 1;
        setUnitRatio(newRatio);

        // Cập nhật chênh lệch giá
        if (currentProduct && exchangeInfo) {
            updateDifference(newProductPrice, quantity, newRatio, exchangeInfo.price);
        }
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuantity = Number(e.target.value);
        setQuantity(newQuantity);

        if (currentProduct && exchangeInfo) {
            updateDifference(newProductPrice, newQuantity, unitRatio, exchangeInfo.price);
        }
    };

    const productPrice = (() => {
        if (currentProduct) {
            const product = products.find(prod => String(prod._id) === String(currentProduct._id));
            return product ? product.price : 0;
        }
        return 0;
    })();
    const totalPrice = productPrice * quantity * unitRatio;
    const canExchange = totalPrice >= exchangeInfo?.price || false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[480px] max-w-[96vw] w-[560px] border-2 border-blue-200">
                <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Đổi sản phẩm</h2>

                <div className="mb-5 bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg">Sản phẩm đổi:</h3>
                    <p className="text-lg">Tên: <span className="font-medium">{
                        (() => {
                            const product = products.find(p => String(p._id) === String(exchangeInfo?.productId));
                            if (product) return product.name;
                        })()
                    }</span></p>
                    <p className="text-lg">Giá trị: <span className="font-bold text-red-600">{exchangeInfo.price ? exchangeInfo.price.toLocaleString('vi-VN') : 0} VNĐ</span></p>
                </div>

                <div className="mb-5">
                    <label className="block mb-2 font-semibold text-lg">Tìm kiếm sản phẩm</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="Nhập số lô sản phẩm để tìm kiếm..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                        <span className="absolute right-3 top-2.5 text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                    </div>
                </div>

                {/* <div className="mb-5">
                    <label className="block mb-2 font-semibold text-lg">Chọn sản phẩm mới</label>
                    <div className="flex gap-2 items-center">
                        <select
                            className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={newProductId}
                            onChange={handleProductChange}
                        >
                            <option value="">-- Chọn sản phẩm --</option>
                            {filteredProducts.map(p => {
                                const product = products.find(prod => prod._id === p.product_id);
                                const displayName = product ? product.name : (p.product_name || "Sản phẩm không tên");
                                // ... existing code ...
                                return (
                                    <option
                                        key={p._id}
                                        value={p._id}
                                        className={
                                            isAboutToExpire
                                                ? "text-red-700 font-semibold"
                                                : isNearExpiry
                                                    ? "text-yellow-700"
                                                    : ""
                                        }
                                        disabled={p.inventory !== undefined && p.inventory <= 0}
                                    >
                                        {displayName}
                                        {barcode && ` | ${barcode}`}
                                        {stockInfo && ` | ${stockInfo}`}
                                        {mfgDateLabel && ` | ${mfgDateLabel}`}
                                        {expDateLabel && ` | ${expDateLabel}`}{warningIcon}
                                    </option>
                                );
                            })}
                        </select>
                        {newProductId && (
                            <button
                                type="button"
                                className="ml-2 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-700 border border-gray-300"
                                title="Bỏ chọn sản phẩm mới"
                                onClick={() => {
                                    setNewProductId('');
                                    setCurrentProduct(null);
                                    setNewProductPrice(0);
                                    setDifference(-exchangeInfo.price);
                                    setQuantity(1);
                                    setUnit('cái');
                                    setUnitRatio(1);
                                }}
                            >
                                Bỏ chọn
                            </button>
                        )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                        Hiển thị {filteredProducts.length} sản phẩm {searchTerm ? `cho từ khoá "${searchTerm}"` : ''}
                    </div>
                    <div className="mt-2 flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">Sắp hết hạn (dưới 1 tháng) ⚠️</span>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Gần hết hạn (dưới 3 tháng)</span>
                    </div>
                </div> */}

                {currentProduct && (
                    <>
                        <div className="mb-5 bg-yellow-50 p-4 rounded-lg">
                            <div className="flex gap-4">
                                {currentProduct.image_url && (
                                    <div className="w-24 h-24 flex-shrink-0">
                                        <img
                                            src={currentProduct.image_url}
                                            alt={currentProduct.name}
                                            className="w-full h-full object-cover rounded-lg border border-yellow-300"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-yellow-700 mb-2">Thông tin sản phẩm</h3>
                                    <p className="text-lg">Tên: <span className="font-medium">{currentProduct.name || "Sản phẩm không tên"}</span></p>
                                    <p className="text-lg">Giá bán: <span className="font-bold text-red-600">{currentProduct.price ? currentProduct.price.toLocaleString('vi-VN') : "0"} VNĐ</span></p>
                                    <p className="text-lg">Tồn kho: <span className={`font-medium ${currentProduct.inventory !== undefined && currentProduct.inventory < 5 ? 'text-red-600' : ''}`}>{currentProduct.inventory !== undefined ? `${currentProduct.inventory} sản phẩm` : "Chưa cập nhật"}</span></p>
                                    <p className="text-lg">Hạn sử dụng:
                                        {currentProduct.exp_date ? (
                                            <span className={`ml-2 font-medium px-2 py-1 rounded-md border ${new Date(currentProduct.exp_date) < new Date(new Date().setMonth(new Date().getMonth() + 1))
                                                ? "bg-red-100 text-red-700 border-red-300"
                                                : new Date(currentProduct.exp_date) < new Date(new Date().setMonth(new Date().getMonth() + 3))
                                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                                    : "bg-orange-100 text-orange-700 border-orange-300"
                                                }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(currentProduct.exp_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                {new Date(currentProduct.exp_date) < new Date(new Date().setMonth(new Date().getMonth() + 1)) &&
                                                    <span className="ml-2 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-bold">
                                                        Sắp hết hạn
                                                    </span>
                                                }
                                            </span>
                                        ) : (
                                            <span className="ml-2 font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                                                Không có HSD
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="col-span-1">
                                <label className="block mb-2 font-semibold text-lg">Số lượng</label>
                                <div className="flex items-center">
                                    <button
                                        className="w-10 h-10 bg-blue-100 rounded-l-lg flex items-center justify-center border border-blue-300"
                                        onClick={() => quantity > 1 && handleQuantityChange({ target: { value: String(quantity - 1) } } as React.ChangeEvent<HTMLInputElement>)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        max={currentProduct?.inventory || 100}
                                        className="w-20 h-10 border-t border-b border-blue-300 text-center text-xl font-medium focus:outline-none"
                                        value={quantity}
                                        onChange={handleQuantityChange}
                                    />
                                    <button
                                        className="w-10 h-10 bg-blue-100 rounded-r-lg flex items-center justify-center border border-blue-300"
                                        onClick={() => handleQuantityChange({ target: { value: String(quantity + 1) } } as React.ChangeEvent<HTMLInputElement>)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block mb-2 font-semibold text-lg">Đơn vị tính</label>
                                <select
                                    className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    value={unit}
                                    onChange={handleUnitChange}
                                >
                                    {isLoadingUnits ? (
                                        <option value="cái">Đang tải...</option>
                                    ) : (
                                        units.map((u: IUnit) => (
                                            <option key={u._id} value={u.name}>{u.name} (x{u.equal})</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="mb-5 p-3 rounded-lg bg-gray-50">
                            <div className="flex justify-between mb-1">
                                <span>Giá sản phẩm mới:</span>
                                <span className="font-medium">{productPrice ? productPrice.toLocaleString('vi-VN') : 0} VNĐ</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Số lượng:</span>
                                <span className="font-medium">x {quantity} {unit}</span>
                            </div>
                            {unitRatio > 1 && (
                                <div className="flex justify-between mb-1">
                                    <span>Hệ số quy đổi của {unit}:</span>
                                    <span className="font-medium">x {unitRatio}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-1">
                                <span>Thành tiền:</span>
                                <span className="font-medium">{totalPrice ? totalPrice.toLocaleString('vi-VN') : 0} VNĐ</span>
                            </div>
                            <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                                <span>Chênh lệch:</span>
                                <span className={difference > 0 ? "text-red-500" : difference < 0 ? "text-green-500" : ""}>
                                    {difference > 0 ? '+' : ''}{difference.toLocaleString('vi-VN')} VNĐ
                                </span>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold text-lg"
                        onClick={onClose}
                    >Hủy</button>
                    <button
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-lg shadow"
                        onClick={() => newProductId && quantity > 0 && onSubmit({
                            newProductId,
                            quantity,
                            unit,
                            unitRatio
                        })}
                        disabled={!newProductId || quantity <= 0 || !canExchange}
                    >
                        {canExchange ? 'Xác nhận đổi hàng' : 'Giá trị sản phẩm quá thấp'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReturnExchangePage(): React.ReactElement {
    const [search, setSearch] = useState('');
    const [orders, setOrders] = useState<IOrder[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [productDetails, setProductDetails] = useState<IProductDetail[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{
        type: ENotificationType,
        message: string
    } | null>(null);
    const [itemStatus, setItemStatus] = useState<{ [key: string]: string }>({});

    const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
    const [exchangeInfo, setExchangeInfo] = useState<{ productId: string, price: number } | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
    const [units, setUnits] = useState<IUnit[]>([]);
    const [unit, setUnit] = useState('cái');
    const [employeeName, setEmployeeName] = useState<string>('');

    // Lấy danh sách hóa đơn và sản phẩm
    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchGetCollections<IOrder>(ECollectionNames.ORDER),
            fetchGetCollections<IProduct>(ECollectionNames.PRODUCT),
            fetchGetCollections<IUnit>(ECollectionNames.UNIT),
            fetchGetCollections<IProductDetail>(ECollectionNames.PRODUCT_DETAIL)
        ])
            .then(([orderData, productData, unitsData, productDetailData]) => {
                console.log("Dữ liệu hóa đơn từ API:", orderData);
                console.log("Dữ liệu sản phẩm từ API:", productData);
                console.log("Dữ liệu đơn vị tính từ API:", unitsData);
                console.log("Dữ liệu chi tiết sản phẩm từ API:", productDetailData);

                // Kiểm tra và chuyển đổi định dạng dữ liệu nếu cần
                const formattedOrderData = orderData.map((order: any) => {
                    // Kiểm tra nếu hóa đơn có cấu trúc khác với interface
                    if (!order.prodetail && (order.products || order.items || order.orderDetails || order.details)) {
                        console.log('Tìm thấy cấu trúc khác, đang chuyển đổi...');
                        // Thử các trường dữ liệu khác nhau có thể chứa thông tin chi tiết sản phẩm
                        const productDetails = order.products || order.items || order.orderDetails || order.details || [];

                        return {
                            ...order,
                            prodetail: productDetails.map((detail: any) => ({
                                _id: detail._id || detail.id || `detail-${Math.random().toString(36).substring(7)}`,
                                product_id: detail.product_id || detail.productId || detail.id || "",
                                product_name: detail.product_name || detail.productName || detail.name || "",
                                quantity: detail.quantity || detail.qty || 1,
                                price: detail.price || detail.unit_price || detail.unitPrice || 0
                            }))
                        };
                    }
                    return order;
                });

                // Nếu không có dữ liệu hoặc dữ liệu rỗng, thêm dữ liệu mẫu
                if (!formattedOrderData || formattedOrderData.length === 0) {
                    const sampleOrders = [
                        {
                            _id: "sample-1",
                            order_code: "HD001",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            total_amount: 250000,
                            prodetail: [
                                {
                                    _id: "detail-1",
                                    product_id: "product-1",
                                    product_name: "Áo thun nam",
                                    quantity: 2,
                                    price: 125000
                                },
                                {
                                    _id: "detail-2",
                                    product_id: "product-2",
                                    product_name: "Quần jean",
                                    quantity: 1,
                                    price: 350000
                                }
                            ]
                        },
                        {
                            _id: "sample-2",
                            order_code: "HD002",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            total_amount: 500000,
                            prodetail: [
                                {
                                    _id: "detail-3",
                                    product_id: "product-3",
                                    product_name: "Giày thể thao",
                                    quantity: 1,
                                    price: 500000
                                }
                            ]
                        }
                    ];
                    setOrders(sampleOrders);
                    console.log("Đã thêm dữ liệu mẫu cho hóa đơn:", sampleOrders);
                } else {
                    setOrders(formattedOrderData);
                }

                // Xử lý dữ liệu sản phẩm
                if (!productData || productData.length === 0) {
                    const sampleProducts = [
                        {
                            _id: "product-1",
                            name: "Áo thun nam",
                            price: 125000,
                            inventory: 50
                        },
                        {
                            _id: "product-2",
                            name: "Quần jean",
                            price: 350000,
                            inventory: 30
                        },
                        {
                            _id: "product-3",
                            name: "Giày thể thao",
                            price: 500000,
                            inventory: 20
                        },
                        {
                            _id: "product-4",
                            name: "Áo khoác",
                            price: 450000,
                            inventory: 15
                        },
                        {
                            _id: "product-5",
                            name: "Xúc xích 200g",
                            price: 35000,
                            inventory: 100,
                            exp_date: "2024-12-31"
                        }
                    ];
                    setProducts(sampleProducts);
                    console.log("Đã thêm dữ liệu mẫu cho sản phẩm:", sampleProducts);
                } else {
                    console.log("Kiểm tra cấu trúc sản phẩm từ API:", productData);
                    // Đảm bảo mọi sản phẩm đều có thuộc tính price
                    const validatedProducts = productData.map((product: any) => ({
                        ...product,
                        price: product.price || product.output_price || product.selling_price || product.original_price || 0,
                        name: product.name || product.product_name || product.title || "Sản phẩm không tên"
                    }));
                    setProducts(validatedProducts);
                    console.log("Sản phẩm sau khi validate:", validatedProducts);
                }

                // Xử lý dữ liệu chi tiết sản phẩm
                if (!productDetailData || productDetailData.length === 0) {
                    // Tạo dữ liệu mẫu chi tiết sản phẩm
                    const sampleProductDetails = [
                        {
                            _id: "pd-1",
                            product_id: "product-1",
                            product_name: "Áo thun nam - Size M",
                            price: 125000,
                            quantity: 20,
                            inventory: 20, // Tồn kho
                            expiry_date: undefined // Không có HSD vì là sản phẩm không thực phẩm
                        },
                        {
                            _id: "pd-2",
                            product_id: "product-1",
                            product_name: "Áo thun nam - Size L",
                            price: 125000,
                            quantity: 30,
                            inventory: 30,
                            expiry_date: undefined
                        },
                        {
                            _id: "pd-5",
                            product_id: "product-5",
                            product_name: "Xúc xích 200g",
                            price: 35000,
                            quantity: 50,
                            inventory: 50,
                            expiry_date: "2024-12-31"
                        },
                        {
                            _id: "pd-6",
                            product_id: "product-5",
                            product_name: "Xúc xích 200g",
                            price: 32000,
                            quantity: 20,
                            inventory: 20,
                            expiry_date: "2024-06-30"
                        },
                        {
                            _id: "pd-7",
                            product_id: "product-5",
                            product_name: "Xúc xích 500g",
                            price: 67000,
                            quantity: 15,
                            inventory: 15,
                            expiry_date: "2024-10-15"
                        },
                        {
                            _id: "pd-8",
                            product_id: "product-5",
                            product_name: "Xúc xích phô mai",
                            price: 45000,
                            quantity: 25,
                            inventory: 25,
                            expiry_date: "2024-08-25"
                        }
                    ];
                    setProductDetails(sampleProductDetails);
                    console.log("Đã thêm dữ liệu mẫu cho chi tiết sản phẩm:", sampleProductDetails);
                } else {
                    // Xử lý dữ liệu chi tiết sản phẩm từ API
                    const validatedProductDetails = productDetailData.map((detail: any) => {
                        // Tìm sản phẩm tương ứng để lấy tên
                        const relatedProduct = products.find(p => p._id === detail.product_id);

                        return {
                            ...detail,
                            product_name: detail.product_name || (relatedProduct ? relatedProduct.name : "Chi tiết sản phẩm"),
                            price: detail.price || (relatedProduct ? relatedProduct.price : 0),
                            quantity: detail.quantity || detail.stock || 0
                        };
                    });
                    setProductDetails(validatedProductDetails);
                    console.log("Chi tiết sản phẩm sau khi validate:", validatedProductDetails);
                }

                // Xử lý dữ liệu đơn vị tính
                if (!unitsData || unitsData.length === 0) {
                    // Sử dụng dữ liệu mẫu cho đơn vị tính
                    const sampleUnits = [
                        { _id: 'unit-1', name: 'cái', equal: 1, created_at: new Date(), updated_at: new Date() },
                        { _id: 'unit-2', name: 'hộp', equal: 10, created_at: new Date(), updated_at: new Date() },
                        { _id: 'unit-3', name: 'thùng', equal: 24, created_at: new Date(), updated_at: new Date() },
                        { _id: 'unit-4', name: 'lốc', equal: 6, created_at: new Date(), updated_at: new Date() }
                    ];
                    setUnits(sampleUnits);
                    console.log("Đã thêm dữ liệu mẫu cho đơn vị tính:", sampleUnits);
                } else {
                    setUnits(unitsData);
                }
            })
            .catch(error => {
                console.error("Lỗi khi lấy dữ liệu:", error);
                // Thêm dữ liệu mẫu khi có lỗi
                const sampleOrders = [
                    {
                        _id: "sample-error-1",
                        order_code: "HD001",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        total_amount: 250000,
                        prodetail: [
                            {
                                _id: "detail-1",
                                product_id: "product-1",
                                product_name: "Áo thun nam",
                                quantity: 2,
                                price: 125000
                            }
                        ]
                    }
                ];
                const sampleProducts = [
                    {
                        _id: "product-1",
                        name: "Áo thun nam",
                        price: 125000,
                        inventory: 50
                    },
                    {
                        _id: "product-4",
                        name: "Áo khoác",
                        price: 450000,
                        inventory: 15
                    }
                ];
                const sampleUnits = [
                    { _id: 'unit-1', name: 'cái', equal: 1, created_at: new Date(), updated_at: new Date() },
                    { _id: 'unit-2', name: 'hộp', equal: 10, created_at: new Date(), updated_at: new Date() }
                ];
                setOrders(sampleOrders);
                setProducts(sampleProducts);
                setUnits(sampleUnits);
            })
            .finally(() => setLoading(false));
    }, []);

    // Lấy tên nhân viên đăng nhập
    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (!response.ok) throw new Error('Failed to fetch employee');
                const data = await response.json();
                const accountId = data._id;
                // Lấy thông tin chi tiết user
                const userResponse = await fetch(`/api/user/account/${accountId}`);
                if (!userResponse.ok) throw new Error('Failed to fetch user details');
                const userData = await userResponse.json();
                const fullName = userData.name || '';
                setEmployeeName(fullName || 'Chưa xác định');
            } catch (err) {
                setEmployeeName('Chưa xác định');
            }
        };
        fetchEmployee();
    }, []);

    // Lấy tên sản phẩm từ id
    const getProductName = (id?: string) => {
        if (!id) return "";
        const found = products.find(p => p._id === id);
        return found ? found.name : id;
    };

    // Lấy giá sản phẩm từ id
    const getProductPrice = (id?: string) => {
        if (!id) return 0;
        const found = products.find(p => p._id === id);
        return found ? found.price : 0;
    };

    // Tìm kiếm order_code chính xác
    const foundOrder = search.trim() !== '' ? orders.find(o =>
        o.order_code?.toLowerCase() === search.trim().toLowerCase() ||
        (typeof o.order_code === 'string' && o.order_code.includes(search.trim()))
    ) : undefined;

    useEffect(() => {
        // Thử tìm hóa đơn bằng cách so sánh một phần của mã
        if (search.trim() !== '' && !foundOrder) {
            console.log('Không tìm thấy hóa đơn chính xác, đang tìm gần đúng...');
            const partialMatch = orders.find(o =>
                o.order_code?.toLowerCase().includes(search.trim().toLowerCase())
            );
            if (partialMatch) {
                console.log('Tìm thấy hóa đơn gần đúng:', partialMatch);
                // Tự động điền lại ô tìm kiếm với giá trị chính xác
                setSearch(partialMatch.order_code || '');
            }
        }
        // Kiểm tra quá hạn đổi hàng
        if (search.trim() !== '' && foundOrder) {
            const createdDate = new Date(foundOrder.created_at);
            const now = new Date();
            const diffTime = now.getTime() - createdDate.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);
            if (diffDays > 7) {
                setNotification({
                    type: ENotificationType.ERROR,
                    message: 'Hóa đơn đã quá hạn đổi!'
                });
            }
        }
    }, [search, orders, foundOrder]);

    // Kiểm tra cấu trúc dữ liệu và thêm dữ liệu mẫu nếu cần
    useEffect(() => {
        if (foundOrder) {
            console.log('Found Order Structure:', foundOrder);

            // Tìm thấy hóa đơn nhưng không có chi tiết
            if (!foundOrder.prodetail || foundOrder.prodetail.length === 0) {
                console.log('Hóa đơn không có chi tiết, thêm dữ liệu mẫu');
                // Thêm dữ liệu mẫu cho hóa đơn tìm thấy
                const updatedOrders = orders.map(order => {
                    if (order._id === foundOrder._id) {
                        return {
                            ...order,
                            prodetail: [
                                {
                                    _id: "detail-sample-1",
                                    product_id: products.length > 0 ? products[0]._id : "product-1",
                                    product_name: products.length > 0 ? products[0].name : "Áo thun nam",
                                    quantity: 2,
                                    price: 125000
                                },
                                {
                                    _id: "detail-sample-2",
                                    product_id: products.length > 1 ? products[1]._id : "product-2",
                                    product_name: products.length > 1 ? products[1].name : "Quần jean",
                                    quantity: 1,
                                    price: 350000
                                }
                            ]
                        };
                    }
                    return order;
                });
                setOrders(updatedOrders);
            }
        }
    }, [foundOrder, orders, products]);

    // Chọn checkbox
    const handleCheck = (id: string) => {
        setSelectedItems((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Mở modal đổi hàng
    const handleOpenExchange = () => {
        if (!foundOrder || selectedItems.length === 0) return;

        // Kiểm tra hóa đơn có chi tiết sản phẩm không
        if (!foundOrder.prodetail || foundOrder.prodetail.length === 0) {
            setNotification({
                type: ENotificationType.ERROR,
                message: 'Hóa đơn này không có chi tiết sản phẩm. Vui lòng kiểm tra lại dữ liệu hóa đơn!'
            });
            return;
        }

        // Lấy thông tin sản phẩm đầu tiên được chọn
        const itemId = selectedItems[0];
        const [orderId, detailId] = itemId.split('-');
        const orderDetail = foundOrder.prodetail.find((d: IOrderDetail) => d._id === detailId);

        if (orderDetail) {
            const exchangePrice = orderDetail.price * orderDetail.quantity;
            setExchangeInfo({
                productId: orderDetail.product_id,
                price: exchangePrice
            });
            setSelectedOrder(foundOrder);
            setExchangeModalOpen(true);
        } else {
            setNotification({
                type: ENotificationType.ERROR,
                message: 'Không tìm thấy thông tin chi tiết sản phẩm trong hóa đơn! Vui lòng kiểm tra lại dữ liệu.'
            });
        }
    };

    // Xác nhận đổi sản phẩm
    const handleConfirmExchange = async (data: { newProductId: string, quantity: number, unit: string, unitRatio: number }) => {
        if (!foundOrder || !exchangeInfo) return;

        try {
            // Xác định chi tiết sản phẩm mới từ productDetails
            const newProductDetail = productDetails.find(p => p._id === data.newProductId);
            if (!newProductDetail) {
                setNotification({
                    type: ENotificationType.ERROR,
                    message: 'Không tìm thấy thông tin chi tiết sản phẩm mới'
                });
                return;
            }

            // Kiểm tra số lượng tồn kho
            const newProductInventory = newProductDetail.inventory || 0;
            const totalQuantityNeeded = data.quantity * data.unitRatio;

            if (newProductInventory < totalQuantityNeeded) {
                setNotification({
                    type: ENotificationType.ERROR,
                    message: `Không đủ số lượng trong kho! Chỉ còn ${newProductInventory} sản phẩm.`
                });
                return;
            }

            // Tìm thông tin sản phẩm gốc nếu cần
            const newProduct = products.find(p => p._id === newProductDetail.product_id);
            const unitMultiplier = data.unitRatio;

            // Tính toán giá trị sản phẩm mới
            const newProductPrice = newProductDetail.price || 0;
            const newTotalPrice = newProductPrice * data.quantity * unitMultiplier;

            // Tính chênh lệch giá (phụ thu)
            const priceDifference = newTotalPrice - exchangeInfo.price;
            const additionalPayment = priceDifference > 0 ? priceDifference : 0;

            // Lấy thông tin chi tiết sản phẩm cũ đang được đổi
            const itemId = selectedItems[0];
            const [, detailId] = itemId.split('-');
            const oldItemDetail = foundOrder.prodetail.find((d: IOrderDetail) => d._id === detailId);

            if (!oldItemDetail) {
                setNotification({
                    type: ENotificationType.ERROR,
                    message: 'Không tìm thấy thông tin sản phẩm cần đổi'
                });
                return;
            }

            console.log("Bắt đầu xử lý đổi hàng...");

            // Kiểm tra lần cuối số lượng tồn kho
            if (newProductDetail.inventory !== undefined &&
                newProductDetail.inventory < totalQuantityNeeded) {
                setNotification({
                    type: ENotificationType.WARNING,
                    message: `Không đủ số lượng trong kho! Chỉ còn ${newProductDetail.inventory} sản phẩm.`
                });
                return;
            }

            // TẠO PHIẾU ĐỔI HÀNG VÀ CẬP NHẬT TẤT CẢ THÔNG TIN
            console.log("Gửi request đổi hàng với data:", {
                oldProduct: oldItemDetail,
                newProduct: newProductDetail,
                selectedItem: detailId,
                quantity: data.quantity,
                unitMultiplier: unitMultiplier,
                user_name: employeeName
            });

            const res = await fetch('/api/return-exchange/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Thông tin phiếu đổi hàng
                    receipt_id: foundOrder.order_code || String(foundOrder._id), // Bắt buộc
                    order_id: foundOrder._id, // Bắt buộc
                    customer_id: foundOrder.customer_id || 'guest', // Bắt buộc

                    // Chi tiết sản phẩm cần đổi
                    old_product_details: selectedItems.map(itemId => {
                        const [, detailId] = itemId.split('-');
                        const detail = foundOrder.prodetail.find((d: IOrderDetail) => d._id === detailId);
                        return {
                            product_id: detail?.product_id,
                            product_detail_id: detailId,
                            product_name: detail?.product_name || getProductName(detail?.product_id),
                            quantity: detail?.quantity || 1,
                            price: detail?.price || 0
                        };
                    }),

                    // Thông tin sản phẩm mới
                    new_product_detail: {
                        product_detail_id: newProductDetail._id,
                        product_id: newProductDetail.product_id,
                        product_name: newProductDetail.product_name || (newProduct?.name || ''),
                        quantity: data.quantity,
                        unit: data.unit,
                        unit_ratio: unitMultiplier,
                        price: newProductPrice,
                        is_exchanged: true,
                        // Thêm các thông tin cần thiết cho việc hiển thị trong đơn hàng
                        _id: newProductDetail._id, // Sử dụng ID của chi tiết sản phẩm mới
                        total: newProductPrice * data.quantity // Thêm tổng giá trị
                    },

                    // Thông tin đổi hàng
                    action: 'exchange', // Bắt buộc: 'exchange' hoặc 'return'
                    status: 'Hoàn thành', // Đặt trạng thái là hoàn thành
                    additional_payment: additionalPayment,

                    // Thông tin để cập nhật tồn kho
                    inventory_updates: {
                        decrease: {
                            product_detail_id: newProductDetail._id,
                            quantity: totalQuantityNeeded,
                            reason: `Đổi hàng từ hóa đơn ${foundOrder.order_code}`
                        },
                        increase: {
                            product_detail_id: oldItemDetail._id,
                            quantity: oldItemDetail.quantity || 1,
                            reason: `Trả lại từ đổi hàng - hóa đơn ${foundOrder.order_code}`
                        }
                    },

                    // Thông tin cập nhật đơn hàng
                    order_update: {
                        order_id: foundOrder._id,
                        old_product_detail_id: oldItemDetail?.product_id,
                        total_amount_adjustment: additionalPayment,
                        has_return_exchange: true
                    },

                    // Thông tin bổ sung (không bắt buộc)
                    note: `Đổi từ ${oldItemDetail.product_name || getProductName(oldItemDetail.product_id)} sang ${newProductDetail.product_name || (newProduct?.name || '')}`,
                    user_name: employeeName
                })
            });

            // Kiểm tra status code
            if (!res.ok) {
                console.error(`Lỗi API: ${res.status} - ${res.statusText}`);
                const errorData = await res.json().catch(() => ({ error: 'Không thể đọc dữ liệu lỗi' }));
                console.error("Chi tiết lỗi:", errorData);

                setNotification({
                    type: ENotificationType.ERROR,
                    message: `Lỗi khi đổi hàng: ${errorData.error || res.statusText}`
                });
                return;
            }

            const responseData = await res.json() as IReturnExchangeResponse;
            console.log("Kết quả từ API:", responseData);

            if (responseData.success) {
                console.log("Đổi hàng thành công");

                // Trạng thái đã được thiết lập khi tạo phiếu

                // Hiển thị thông báo thành công với chi tiết
                const successMessage = `Đổi hàng thành công! Đã đổi từ "${oldItemDetail.product_name || 'Sản phẩm cũ'}" sang "${newProductDetail.product_name || 'Sản phẩm mới'}"`;

                setNotification({
                    type: ENotificationType.SUCCESS,
                    message: successMessage
                });

                // Thông báo cho người dùng làm mới trang để thấy thay đổi
                setTimeout(() => {
                    setNotification({
                        type: ENotificationType.INFO,
                        message: 'Làm mới trang để xem thay đổi cập nhật mới nhất'
                    });
                }, 3000);

                // Cập nhật trạng thái các item được chọn
                const updatedStatus = { ...itemStatus };
                selectedItems.forEach(itemId => {
                    updatedStatus[itemId] = STATUS.COMPLETED;
                });
                setItemStatus(updatedStatus);

                // Làm mới dữ liệu hóa đơn
                if (search) {
                    setTimeout(() => {
                        setSearch(search); // Trigger tìm kiếm lại để refresh dữ liệu
                    }, 500);
                }
            } else {
                console.error("Lỗi khi đổi hàng:", responseData);
                setNotification({
                    type: ENotificationType.ERROR,
                    message: 'Đổi sản phẩm thất bại: ' + (responseData.message || responseData.error || '')
                });
            }
        } catch (err) {
            console.error('Lỗi khi đổi sản phẩm:', err);
            setNotification({ type: ENotificationType.ERROR, message: 'Có lỗi khi đổi sản phẩm!' });
        }

        setExchangeModalOpen(false);
        setSelectedItems([]);
    };

    // Thêm biến kiểm tra quá hạn đổi hàng
    const isOrderExpired = (() => {
        if (!foundOrder) return false;
        const createdDate = new Date(foundOrder.created_at);
        const now = new Date();
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays > 7;
    })();

    return (
        <div className="h-lvh flex flex-col gap-4 p-4 bg-[#fff]">
            <h1 className="text-3xl font-bold text-[#f14254] mb-4">Quản lý đổi hàng</h1>

            <div className="mb-6">
                <div className="mb-4 flex items-center">
                    <div className="bg-[#fffdae] px-3 py-2 rounded-md font-medium">Tìm kiếm:</div>
                    <input
                        type="text"
                        placeholder="Nhập mã hóa đơn để tìm kiếm"
                        className="ml-2 px-4 py-2 border rounded-md w-96 bg-[#ffecf2] focus:outline-none focus:ring-2 focus:ring-pink-300"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {search.trim() === '' ? null : loading ? (
                    <div className="text-center py-6 text-gray-500">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mr-2"></div>
                        Đang tải...
                    </div>
                ) : foundOrder ? (
                    <>
                        {/* Thông tin hóa đơn */}
                        <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-gray-500 mb-1">Mã hóa đơn:</div>
                                    <div className="text-blue-600 font-bold text-lg">{foundOrder.order_code}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Ngày tạo:</div>
                                    <div className="font-medium">{new Date(foundOrder.created_at).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-1">Tổng tiền:</div>
                                    <div className="font-medium text-red-600">{foundOrder.total_amount ? foundOrder.total_amount.toLocaleString('vi-VN') : 0} VNĐ</div>
                                </div>
                            </div>
                        </div>

                        {/* Bảng sản phẩm */}
                        <div className="overflow-x-auto rounded-lg shadow mb-5">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-12">
                                            <input type="checkbox" disabled className="rounded border-gray-300 text-blue-600" />
                                        </th>
                                        <th className="px-4 py-3 text-left text-lg font-medium text-gray-600">Sản phẩm</th>
                                        <th className="px-4 py-3 text-center text-lg font-medium text-gray-600">Đơn giá</th>
                                        <th className="px-4 py-3 text-center text-lg font-medium text-gray-600">Số lượng</th>
                                        <th className="px-4 py-3 text-center text-lg font-medium text-gray-600">Thành tiền</th>
                                        <th className="px-4 py-3 text-center text-lg font-medium text-gray-600">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {!foundOrder.prodetail || foundOrder.prodetail.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-lg text-gray-500">
                                                Không có sản phẩm nào trong hóa đơn này
                                            </td>
                                        </tr>
                                    ) : (
                                        foundOrder.prodetail.map((item: IOrderDetail, idx: number) => {
                                            const itemId = foundOrder._id + '-' + item._id;
                                            const status = itemStatus[itemId] || STATUS.PENDING;
                                            const isSelectable = [STATUS.PENDING].includes(status);
                                            const itemPrice = item.price || 0;

                                            return (
                                                <tr key={itemId} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.includes(itemId)}
                                                            onChange={() => isSelectable && handleCheck(itemId)}
                                                            disabled={!isSelectable}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-lg text-gray-900 font-medium">
                                                        {item.product_name || getProductName(item.product_id)}
                                                    </td>
                                                    <td className="px-4 py-3 text-lg text-gray-900 text-center">
                                                        <span className="font-medium text-red-600">{itemPrice.toLocaleString('vi-VN')} VNĐ</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-lg text-gray-900 text-center">
                                                        {item.quantity || 0}
                                                    </td>
                                                    <td className="px-4 py-3 text-lg text-gray-900 text-center font-medium">
                                                        <span className="font-bold text-red-600">{((itemPrice) * (item.quantity || 1)).toLocaleString('vi-VN')} VNĐ</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {status === STATUS.PENDING && (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-lg">
                                                                Chờ xử lý
                                                            </span>
                                                        )}
                                                        {status === STATUS.EXCHANGING && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-lg">
                                                                Đang đổi hàng
                                                            </span>
                                                        )}
                                                        {status === STATUS.COMPLETED && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-lg">
                                                                Hoàn thành
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                className="bg-[#4caf50] text-white px-6 py-2 rounded-md font-medium hover:bg-[#43a047] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
                                onClick={handleOpenExchange}
                                disabled={selectedItems.length === 0 || isOrderExpired}
                            >
                                Đổi sản phẩm
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center py-6 text-red-500 bg-red-50 rounded-lg border border-red-200">
                            <p className="mb-4">Không tìm thấy hóa đơn với mã này!</p>
                            <button
                                className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-md hover:bg-red-200"
                                onClick={() => {
                                    setNotification({
                                        type: ENotificationType.ERROR,
                                        message: `Không tìm thấy hóa đơn với mã: ${search}`
                                    });
                                }}
                            >
                                Hiển thị thông báo
                            </button>
                        </div>
                    </>
                )}

                <div className="mt-8">
                    <div className="bg-[#ff9800] text-white px-4 py-2 rounded-l-full font-bold inline-block">
                        Quy định đổi hàng
                    </div>
                    <ul className="mt-3 ml-6 space-y-1 text-lg list-disc">
                        <li>Sản phẩm đổi phải có giá trị bằng hoặc cao hơn sản phẩm đổi. Nếu cao hơn, khách hàng cần thanh toán thêm.</li>
                        <li>Chỉ đổi sản phẩm còn nguyên vẹn, chưa qua sử dụng.</li>
                        <li>Thời hạn đổi: 7 ngày kể từ ngày mua hàng.</li>
                    </ul>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Xử lý số lượng khi đổi hàng:</h3>
                    <ul className="ml-6 space-y-1 text-lg list-disc">
                        <li>
                            <span className="font-medium">Đổi hàng:</span>
                            <ul className="ml-6 mt-1 space-y-1 list-circle">
                                <li>Số lượng sản phẩm cũ được trả lại kho (+)</li>
                                <li>Số lượng sản phẩm mới được trừ từ kho (-)</li>
                                <li>Nếu sản phẩm mới không đủ số lượng trong kho, hệ thống sẽ thông báo và không cho phép đổi</li>
                            </ul>
                        </li>

                    </ul>
                </div>
            </div>

            {/* Modal đổi sản phẩm */}
            <ExchangeProductModal
                open={exchangeModalOpen}
                onClose={() => setExchangeModalOpen(false)}
                onSubmit={handleConfirmExchange}
                products={products}
                productDetails={productDetails}
                exchangeInfo={exchangeInfo}
            />

            {notification && (
                <CustomNotification
                    type={notification.type}
                    onDelete={() => setNotification(null)}
                    isAutoClose={true}
                >
                    {notification.message}
                </CustomNotification>
            )}
        </div>
    );
} 