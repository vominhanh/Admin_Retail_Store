'use client';

import React, { useState, useEffect } from 'react';
import styles from './style.module.css';

interface Shipping {
    _id: string;
    order_id: any; // Có thể là object
    customer_name: string;
    customer_phone: string;
    shipping_address: string;
    status: string;
    shipping_fee: number;
    shipping_notes: string;
    created_at: string;
    updated_at: string;
}

interface OrderDetail {
    order_code: string;
    items: Array<{ product_id: string; name: string; quantity: number; price: number }>;
    total_amount: number;
}

// Định nghĩa trạng thái đồng bộ với backend
const SHIPPING_STATUS = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao hàng',
    delivered: 'Đã giao hàng',
    cancelled: 'Đã hủy'
};

export default function ShippingPage(): React.ReactElement {
    const [shippings, setShippings] = useState<Shipping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [orderProductCount, setOrderProductCount] = useState<{ [orderId: string]: number }>({});
    // State tạm cho trạng thái chọn mới
    const [selectedStatus, setSelectedStatus] = useState<{ [id: string]: string }>({});

    const statusOptions = [
        { value: 'pending', label: 'Chờ xác nhận' },
        { value: 'confirmed', label: 'Đã xác nhận' },
        { value: 'shipping', label: 'Đang giao hàng' },
        { value: 'delivered', label: 'Đã giao hàng' },
        { value: 'cancelled', label: 'Đã hủy' },
    ];

    useEffect(() => {
        fetchShippings();
    }, []);

    const fetchShippings = async () => {
        try {
            const response = await fetch('/api/shippings');
            if (response.ok) {
                const data = await response.json();
                setShippings(data);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách vận chuyển:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (shipping: Shipping, newStatus: string) => {
        if (shipping.status === newStatus) return;
        try {
            await fetch(`/api/shippings/${shipping._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchShippings();
        } catch (e) {
            alert('Cập nhật trạng thái thất bại!');
        }
    };

    const handleProductCountClick = async (orderId: any) => {
        setShowModal(true);
        setModalLoading(true);
        let id = getOrderIdString(orderId);
        try {
            const res = await fetch(`/api/order-form/${id}`);
            if (res.ok) {
                const data = await res.json();
                setOrderDetail({
                    order_code: data.order_code || id,
                    items: (data.items || []).map((item: any) => ({
                        product_id: item.product_id,
                        name: item.name || '',
                        quantity: item.quantity,
                        price: item.price
                    })),
                    total_amount: data.total_amount || 0
                });
                setOrderProductCount(prev => ({ ...prev, [id]: (data.items || []).length }));
            } else {
                setOrderDetail(null);
            }
        } catch {
            setOrderDetail(null);
        }
        setModalLoading(false);
    };

    const handleViewDetail = async (orderId: any) => {
        setShowModal(true);
        setModalLoading(true);
        let id = getOrderIdString(orderId);
        try {
            const res = await fetch(`/api/order-form/${id}`);
            if (res.ok) {
                const data = await res.json();
                setOrderDetail({
                    order_code: data.order_code || id,
                    items: (data.items || []).map((item: any) => ({
                        product_id: item.product_id,
                        name: item.name || '',
                        quantity: item.quantity,
                        price: item.price
                    })),
                    total_amount: data.total_amount || 0
                });
            } else setOrderDetail(null);
        } catch {
            setOrderDetail(null);
        }
        setModalLoading(false);
    };

    const closeModal = () => {
        setShowModal(false);
        setOrderDetail(null);
    };

    const filteredShippings = shippings.filter(shipping =>
        shipping.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipping.customer_phone.includes(searchTerm) ||
        shipping.shipping_address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#FFA500';
            case 'confirmed':
                return '#2196F3';
            case 'shipping':
                return '#4CAF50';
            case 'delivered':
                return '#4CAF50';
            case 'cancelled':
                return '#f44336';
            default:
                return '#666';
        }
    };

    const getOrderIdString = (order_id: any) => {
        if (!order_id) return '';
        if (typeof order_id === 'string') return order_id;
        if (order_id.$oid) return order_id.$oid;
        if (order_id._id) return order_id._id;
        if (order_id.id) return order_id.id;
        if (order_id.toString && typeof order_id.toString === 'function') {
            const str = order_id.toString();
            if (str !== '[object Object]') return str;
        }
        return JSON.stringify(order_id);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Quản lý vận chuyển</h1>
                <div className={styles.actions}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm đơn vận chuyển..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Đang tải...</div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã đơn hàng</th>
                                <th>Người nhận</th>
                                <th>Số điện thoại</th>
                                <th>Địa chỉ</th>
                                <th>Số SP</th>
                                <th>Trạng thái</th>
                                <th>Phí vận chuyển</th>
                                <th>Ghi chú</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShippings.map((shipping) => {
                                const orderIdStr = getOrderIdString(shipping.order_id);
                                const productCount = orderProductCount[orderIdStr];
                                return (
                                    <tr key={shipping._id}>
                                        <td>{orderIdStr}</td>
                                        <td>{shipping.customer_name?.toString() || ''}</td>
                                        <td>{shipping.customer_phone?.toString() || ''}</td>
                                        <td>{shipping.shipping_address?.toString() || ''}</td>
                                        <td>
                                            <button className={`${styles.viewButton} text-lg`} onClick={() => handleProductCountClick(shipping.order_id)}>
                                                {productCount !== undefined ? productCount : 'Xem'}
                                            </button>
                                        </td>
                                        <td>
                                            {shipping.status === 'pending' && (
                                                <>
                                                    <select
                                                        className={`${styles.status} text-lg`}
                                                        style={{ backgroundColor: getStatusColor(selectedStatus[shipping._id] || shipping.status), color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                                                        value={selectedStatus[shipping._id] || shipping.status}
                                                        onChange={e => setSelectedStatus(prev => ({ ...prev, [shipping._id]: e.target.value }))}
                                                    >
                                                        <option value="pending">{SHIPPING_STATUS.pending}</option>
                                                        <option value="confirmed">{SHIPPING_STATUS.confirmed}</option>
                                                        <option value="cancelled">{SHIPPING_STATUS.cancelled}</option>
                                                    </select>
                                                    <button className={`${styles.editButton} text-lg`} style={{ marginLeft: 8 }}
                                                        disabled={(selectedStatus[shipping._id] || shipping.status) === shipping.status}
                                                        onClick={async () => {
                                                            await handleStatusChange(shipping, selectedStatus[shipping._id]);
                                                            setSelectedStatus(prev => {
                                                                const newState = { ...prev };
                                                                delete newState[shipping._id];
                                                                return newState;
                                                            });
                                                        }}
                                                    >Cập nhật</button>
                                                </>
                                            )}
                                            {shipping.status === 'confirmed' && (
                                                <>
                                                    <select
                                                        className={`${styles.status} text-lg`}
                                                        style={{ backgroundColor: getStatusColor(selectedStatus[shipping._id] || shipping.status), color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                                                        value={selectedStatus[shipping._id] || shipping.status}
                                                        onChange={e => setSelectedStatus(prev => ({ ...prev, [shipping._id]: e.target.value }))}
                                                    >
                                                        <option value="confirmed">{SHIPPING_STATUS.confirmed}</option>
                                                        <option value="shipping">{SHIPPING_STATUS.shipping}</option>
                                                    </select>
                                                    <button className={`${styles.editButton} text-lg`} style={{ marginLeft: 8 }}
                                                        disabled={(selectedStatus[shipping._id] || shipping.status) === shipping.status}
                                                        onClick={async () => {
                                                            await handleStatusChange(shipping, selectedStatus[shipping._id]);
                                                            setSelectedStatus(prev => {
                                                                const newState = { ...prev };
                                                                delete newState[shipping._id];
                                                                return newState;
                                                            });
                                                        }}
                                                    >Cập nhật</button>
                                                </>
                                            )}
                                            {shipping.status === 'shipping' && (
                                                <>
                                                    <select
                                                        className={`${styles.status} text-lg`}
                                                        style={{ backgroundColor: getStatusColor(selectedStatus[shipping._id] || shipping.status), color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                                                        value={selectedStatus[shipping._id] || shipping.status}
                                                        onChange={e => setSelectedStatus(prev => ({ ...prev, [shipping._id]: e.target.value }))}
                                                    >
                                                        <option value="shipping">{SHIPPING_STATUS.shipping}</option>
                                                        <option value="delivered">{SHIPPING_STATUS.delivered}</option>
                                                    </select>
                                                    <button className={`${styles.editButton} text-lg`} style={{ marginLeft: 8 }}
                                                        disabled={(selectedStatus[shipping._id] || shipping.status) === shipping.status}
                                                        onClick={async () => {
                                                            await handleStatusChange(shipping, selectedStatus[shipping._id]);
                                                            setSelectedStatus(prev => {
                                                                const newState = { ...prev };
                                                                delete newState[shipping._id];
                                                                return newState;
                                                            });
                                                        }}
                                                    >Cập nhật</button>
                                                </>
                                            )}
                                            {shipping.status === 'delivered' && (
                                                <span className={`${styles.status} text-lg`} style={{ backgroundColor: getStatusColor(shipping.status), color: '#fff', borderRadius: 4, padding: '4px 8px' }}>{SHIPPING_STATUS.delivered}</span>
                                            )}
                                            {shipping.status === 'cancelled' && (
                                                <span className={`${styles.status} text-lg`} style={{ backgroundColor: getStatusColor(shipping.status), color: '#fff', borderRadius: 4, padding: '4px 8px' }}>{SHIPPING_STATUS.cancelled}</span>
                                            )}
                                        </td>
                                        <td>{shipping.shipping_fee?.toLocaleString('vi-VN') || '0'}đ</td>
                                        <td>{shipping.shipping_notes?.toString() || ''}</td>
                                        <td>
                                            <button className={`${styles.viewButton} text-lg`} onClick={() => handleViewDetail(shipping.order_id)}>Chi tiết</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal chi tiết đơn hàng */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <button className={styles.closeButton} onClick={closeModal}>Đóng</button>
                        {modalLoading ? (
                            <div>Đang tải chi tiết đơn hàng...</div>
                        ) : orderDetail ? (
                            <div>
                                <h2>Chi tiết đơn hàng: {orderDetail.order_code}</h2>
                                <ul>
                                    {orderDetail.items.map((item, idx) => (
                                        <li key={idx}>
                                            <b>{item.name}</b> - SL: {item.quantity} - Giá: {item.price.toLocaleString('vi-VN')}đ
                                        </li>
                                    ))}
                                </ul>
                                <div><b>Tổng tiền:</b> {orderDetail.total_amount.toLocaleString('vi-VN')}đ</div>
                                <div><b>Tổng số sản phẩm:</b> {orderDetail.items.length}</div>
                            </div>
                        ) : (
                            <div>Không tìm thấy thông tin đơn hàng.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 