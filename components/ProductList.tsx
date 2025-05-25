'use client';

import { IProduct } from '../interfaces/product.interface';
import Image from 'next/image';
import { formatCurrency } from '@/utils/format';

interface ProductListProps {
    products: IProduct[];
    onSelect?: (product: IProduct) => void;
    productStockInfo?: Record<string, number>;
}

export default function ProductList({ products, onSelect, productStockInfo = {} }: ProductListProps) {
    const handleSelectProduct = (product: IProduct) => {
        onSelect?.(product);
    };

    return (
        <div className="grid grid-cols-3 gap-4">
            {products.map((product) => {
                const availableQuantity = productStockInfo[product._id] || 0;

                return (
                    <div
                        key={product._id.toString()}
                        onClick={() => handleSelectProduct(product)}
                        className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 group"
                    >
                        <div className="aspect-square bg-slate-50 rounded-lg relative overflow-hidden mb-3">
                            {product.image_links?.[0] ? (
                                <Image
                                    src={product.image_links[0]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Image
                                        src="/icons/product.svg"
                                        alt="product"
                                        width={24}
                                        height={24}
                                        className="text-slate-300"
                                    />
                                </div>
                            )}
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1 min-h-[40px]">{product.name}</h3>
                        <div className="flex justify-between items-center mt-2">
                            <div>
                                <div className="text-blue-600 font-medium">{formatCurrency(product.output_price)}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Đang bán: {availableQuantity}
                                </div>
                            </div>
                            <div className="p-1.5 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Image
                                    src="/icons/plus.svg"
                                    alt="add"
                                    width={18}
                                    height={18}
                                    className="text-blue-600"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
} 