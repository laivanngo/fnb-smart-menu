// File: pages/dashboard/orders.js
// (PHIÊN BẢN 1.8 - ĐÃ SỬA WEBSOCKET URL ĐỂ HOẠT ĐỘNG TRÊN VPS)

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Hàm trợ giúp để lấy token
const getToken = () => {
    if (typeof window !== 'undefined') { return localStorage.getItem('admin_token'); }
    return null;
};

// Sử dụng biến này
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_PER_PAGE = 50; // Hiển thị 50 đơn hàng mỗi trang

// Component để hiển thị chi tiết đơn hàng (Modal)
function OrderDetails({ orderId, onClose }) { 
    const [orderDetails, setOrderDetails] = useState(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true); setError(''); const token = getToken();
            if (!token || !orderId) return;
            if (!apiUrl) {
                setError("Lỗi cấu hình: API URL chưa được thiết lập.");
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${apiUrl}/admin/orders/${orderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) throw new Error('Token hết hạn.');
                if (!response.ok) throw new Error('Không thể tải chi tiết đơn hàng.');
                const data = await response.json();
                setOrderDetails(data); 
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [orderId]); 

    const formatCurrency = (amount) => amount.toLocaleString('vi-VN') + 'đ';

    return (
        <div style={styles.popupBackdrop} onClick={onClose}>
            <div style={styles.formPopup} onClick={(e) => e.stopPropagation()}>
                <h3>Chi tiết Đơn hàng #{orderId}</h3>
                {isLoading ? <p>Đang tải chi tiết...</p> :
                 error ? <p style={styles.error}>{error}</p> :
                 orderDetails ? (
                    <div style={{fontSize: '0.9rem'}}>
                        <p><strong>Ngày đặt:</strong> {new Date(orderDetails.created_at).toLocaleString('vi-VN')}</p> 
                        <hr style={{margin: '10px 0'}}/>
                        <p><strong>Khách hàng:</strong> {orderDetails.customer_name}</p>
                        <p><strong>SĐT:</strong> {orderDetails.customer_phone}</p>
                        <p><strong>Địa chỉ:</strong> {orderDetails.customer_address}</p>
                        {orderDetails.customer_note && <p><strong>Ghi chú KH:</strong> {orderDetails.customer_note}</p>}
                        <hr style={{margin: '10px 0'}}/>
                        <p><strong>Giao hàng:</strong> {orderDetails.delivery_method_selected === 'NHANH' ? 'Nhanh' : 'Tiêu chuẩn'}</p>
                        <p><strong>Thanh toán:</strong> {orderDetails.payment_method === 'MOMO' ? 'MoMo' : 'Tiền mặt'}</p>
                        <hr style={{margin: '10px 0'}}/>
                        <h4>Các món đã đặt:</h4>
                        <ul style={{listStyle: 'none', paddingLeft: 0, maxHeight: '200px', overflowY: 'auto'}}>
                            {orderDetails.items.map(item => (
                                <li key={item.id} style={{marginBottom: '10px', borderBottom: '1px dashed #eee', paddingBottom: '5px'}}>
                                    <strong>{item.quantity}x {item.product_name}</strong> ({formatCurrency(item.item_price)})
                                    {item.options_selected.length > 0 && (
                                        <ul style={{fontSize: '0.85em', color: '#555', paddingLeft: '15px'}}>
                                            {item.options_selected.map((opt, idx) => <li key={idx}>{opt.value_name}</li>)}
                                        </ul>
                                    )}
                                    {item.item_note && <p style={{fontSize: '0.8em', color: '#777', fontStyle: 'italic'}}>Ghi chú món: {item.item_note}</p>}
                                </li>
                            ))}
                        </ul>
                         <hr style={{margin: '10px 0'}}/>
                         <div className="checkout-total" style={{fontSize: '1rem'}}> 
                                <div className="total-row"><span>Tạm tính:</span><span>{formatCurrency(orderDetails.sub_total)}</span></div>
                                <div className="total-row"><span>Phí giao hàng:</span><span>{orderDetails.delivery_fee > 0 ? formatCurrency(orderDetails.delivery_fee) : 'Miễn phí'}</span></div>
                                {orderDetails.discount_amount > 0 && ( <div className="total-row discount"><span>Giảm giá ({orderDetails.voucher_code}):</span><span>-{formatCurrency(orderDetails.discount_amount)}</span></div> )}
                                <div className="total-row final"><span>Tổng cộng:</span><span>{formatCurrency(orderDetails.total_amount)}</span></div>
                         </div>
                    </div>
                 ) : <p>Không tìm thấy dữ liệu.</p>
                }
                 <button onClick={onClose} style={{...styles.buttonAction, marginTop: '20px'}}>Đóng</button>
            </div>
        </div>
    );
}


// --- Component Trang chính (ĐÃ NÂNG CẤP + WEBSOCKET) ---
export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]); 
    const [selectedOrderId, setSelectedOrderId] = useState(null); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // ⬇️ WEBSOCKET STATE ⬇️
    const ws = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastNotification, setLastNotification] = useState(null);
    // ⬆️ END WEBSOCKET STATE ⬆️
    
    // === STATE CHO PHÂN TRANG ===
    const [page, setPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);

    const orderStatuses = ["MOI", "DA_XAC_NHAN", "DANG_THUC_HIEN", "DANG_GIAO", "HOAN_TAT", "DA_HUY"];
    const statusLabels = { "MOI": "Mới", "DA_XAC_NHAN": "Đã xác nhận", "DANG_THUC_HIEN": "Đang làm", "DANG_GIAO": "Đang giao", "HOAN_TAT": "Hoàn tất", "DA_HUY": "Đã hủy" };

    // --- FETCH DỮ LIỆU ---
    const fetchData = async (pageNum = 1) => { 
        setIsLoading(true); setError(''); 
        const token = getToken();
        if (!token) { router.replace('/login'); return; }
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsLoading(false);
            return;
        }

        const limit = ITEMS_PER_PAGE;
        const skip = (pageNum - 1) * limit;
        
        try {
            const response = await fetch(`${apiUrl}/admin/orders/?skip=${skip}&limit=${limit}`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) throw new Error('Không thể tải Đơn hàng.');
            
            const data = await response.json();
            setOrders(data);
            setPage(pageNum);

            if (data.length < ITEMS_PER_PAGE) {
                setIsLastPage(true);
            } else {
                setIsLastPage(false);
            }

        } catch (err) { 
            setError(err.message); 
            if (err.message.includes('Token')) {
                localStorage.removeItem('admin_token');
                router.replace('/login');
            }
        }
        finally { setIsLoading(false); }
    };

    // Chạy khi trang tải lần đầu
    useEffect(() => { 
        fetchData(1);
    }, []);

    // --- XỬ LÝ PHÂN TRANG ---
    const handleNextPage = () => {
        if (!isLastPage) {
            fetchData(page + 1);
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            fetchData(page - 1);
        }
    };

    // --- XỬ LÝ TRẠNG THÁI ĐƠN HÀNG ---
    const handleStatusChange = async (orderId, newStatus) => {
        const token = getToken();
        if (!token) return;
        if (!apiUrl) return;

        try {
            const response = await fetch(`${apiUrl}/admin/orders/${orderId}/status?status=${newStatus}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) throw new Error('Không thể cập nhật trạng thái.');
            
            // Cập nhật lại danh sách
            fetchData(page);
        } catch (err) {
            alert(`Lỗi: ${err.message}`);
        }
    };

    const formatCurrency = (amount) => amount.toLocaleString('vi-VN') + 'đ';

    // ⬇️ HÀM PHÁT ÂM THANH - DÙNG MP3 TÙY CHỈNH ⬇️
    const playNotificationSound = () => {
        try {
            // Tạo Audio element
            const audio = new Audio();
            
            // URL file MP3 - Thay đổi URL này để dùng file khác
            // Option 1: File online (notification sound chuyên nghiệp)
            audio.src = '/tayduky.mp3';
            
            // Option 2: File local trong thư mục public (nếu bạn upload)
            // audio.src = '/notification-sound.mp3';
            
            // Cấu hình
            audio.volume = 1.0; // Âm lượng tối đa (0.0 - 1.0)
            audio.preload = 'auto'; // Tải trước
            
            // Phát âm thanh
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('🔔 Đã phát âm thanh MP3 thông báo');
                    })
                    .catch(error => {
                        console.warn('⚠️ Trình duyệt chặn autoplay:', error);
                        console.log('💡 Hãy click vào trang trước để cho phép âm thanh');
                    });
            }
        } catch (error) {
            console.error('⚠️ Lỗi phát âm thanh:', error);
        }
    };
    // ⬆️ END HÀM PHÁT ÂM THANH MP3 ⬆️

    // ⬇️ HÀM HIỂN THỊ POPUP ⬇️
    const showNotification = (title, message) => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'order-notification',
                    requireInteraction: true
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: '/favicon.ico'
                        });
                    }
                });
            }
        }
        
        console.log(`📣 Thông báo: ${title} - ${message}`);
    };
    // ⬆️ END HÀM HIỂN THỊ POPUP ⬆️

    // ⬇️ WEBSOCKET CONNECTION - ĐÃ SỬA LỖI ⬇️
    useEffect(() => {
        const token = getToken();
        if (!token) {
            console.log('⚠️ Chưa login, không kết nối WebSocket');
            return;
        }
        
        // ⭐ FIX: Tự động phát hiện WebSocket URL dựa trên môi trường
        const getWebSocketUrl = () => {
            if (!apiUrl) {
                console.error('⚠️ NEXT_PUBLIC_API_URL chưa được cấu hình!');
                return null;
            }
            
            // Chuyển HTTP/HTTPS thành WS/WSS
            let wsProtocol = 'ws://';
            if (apiUrl.startsWith('https://')) {
                wsProtocol = 'wss://';  // Dùng WSS cho HTTPS
            }
            
            // Loại bỏ http:// hoặc https:// để lấy hostname
            const hostname = apiUrl.replace('http://', '').replace('https://', '');
            
            // Xắp url cuối cùng
            return `${wsProtocol}${hostname}/ws/admin/orders`;
        };
        
        const wsUrl = getWebSocketUrl();
        if (!wsUrl) {
            console.error('❌ Không thể tạo WebSocket URL');
            setIsConnected(false);
            return;
        }
        
        console.log('🔌 Đang kết nối WebSocket:', wsUrl);
        
        ws.current = new WebSocket(wsUrl);
        
        // Kết nối thành công
        ws.current.onopen = () => {
            console.log('✅ WebSocket đã kết nối!');
            setIsConnected(true);
        };
        
        // Nhận message từ server
        ws.current.onmessage = (event) => {
            console.log('📩 Nhận WebSocket message:', event.data);
            
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'new_order') {
                    console.log('🆕 Có đơn hàng mới!', data);
                    
                    // 1. Phát âm thanh
                    playNotificationSound();
                    
                    // 2. Hiển thị popup
                    const message = `Đơn #${data.order_id} - ${data.customer_name}\nTổng: ${data.total_amount.toLocaleString('vi-VN')}₫`;
                    showNotification('🔔 ĐƠN HÀNG MỚI!', message);
                    
                    // 3. Lưu thông báo mới nhất
                    setLastNotification(data);
                    
                    // 4. Reload danh sách đơn hàng - FIX LỖI TẠI ĐÂY!
                    fetchData(page);
                    
                    // 5. Làm nổi bật tab trình duyệt
                    document.title = `(1) Đơn mới - Quản lý Đơn hàng`;
                    setTimeout(() => {
                        document.title = 'Quản lý Đơn hàng';
                    }, 5000);
                }
            } catch (error) {
                console.error('⚠️ Lỗi parse WebSocket data:', error);
            }
        };
        
        // Lỗi kết nối
        ws.current.onerror = (error) => {
            console.error('❌ Lỗi WebSocket:', error);
            setIsConnected(false);
        };
        
        // Đóng kết nối
        ws.current.onclose = () => {
            console.log('🔌 WebSocket đã đóng');
            setIsConnected(false);
        };
        
        // Cleanup
        return () => {
            if (ws.current) {
                console.log('🔌 Đóng WebSocket connection');
                ws.current.close();
            }
        };
    }, [page]); // Thêm page vào deps để fetchData có thể dùng page hiện tại
    // ⬆️ END WEBSOCKET CONNECTION ⬆️

    return (
        <div style={styles.container}>
            <Head><title>Quản lý Đơn hàng</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            
            {/* HIỂN THỊ TRẠNG THÁI WEBSOCKET */}
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <h1>📦 Quản lý Đơn hàng</h1>
                
                {isConnected ? (
                    <span style={styles.connectedBadge}>
                        🟢 Real-time đang bật
                    </span>
                ) : (
                    <span style={styles.disconnectedBadge}>
                        🔴 Real-time đang tắt
                    </span>
                )}
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {isLoading ? (
                <p>Đang tải danh sách đơn hàng...</p>
            ) : orders.length === 0 ? (
                <p>Chưa có đơn hàng nào.</p>
            ) : (
                <>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Mã ĐH</th>
                                <th style={styles.th}>Thời gian đặt</th>
                                <th style={styles.th}>Tổng tiền</th>
                                <th style={styles.th}>Trạng thái</th>
                                <th style={styles.th}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td style={styles.td}>#{order.id}</td>
                                    <td style={styles.tdSmall}>{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                                    <td style={styles.td}>{formatCurrency(order.total_amount)}</td>
                                    <td style={styles.td}>
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            style={styles.statusSelect}
                                        >
                                            {orderStatuses.map(st => (
                                                <option key={st} value={st}>{statusLabels[st]}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => setSelectedOrderId(order.id)} 
                                            style={styles.detailButton}
                                        >
                                            Xem CT
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* NÚT PHÂN TRANG */}
                    <div style={styles.paginationControls}>
                        <button 
                            onClick={handlePreviousPage} 
                            disabled={page === 1}
                            style={{...styles.buttonAction, opacity: page === 1 ? 0.5 : 1}}
                        >
                            ← Trang trước
                        </button>
                        <span>Trang {page}</span>
                        <button 
                            onClick={handleNextPage} 
                            disabled={isLastPage}
                            style={{...styles.buttonAction, opacity: isLastPage ? 0.5 : 1}}
                        >
                            Trang sau →
                        </button>
                    </div>
                </>
            )}

            {selectedOrderId && <OrderDetails orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
        </div>
    );
}

// --- CSS (HOÀN CHỈNH) ---
const styles = {
    container: { padding: '30px' },
    backLink: { display: 'inline-block', marginBottom: '20px', color: '#555', textDecoration: 'none' },
    error: { color: 'red', marginBottom: '15px', fontSize: '0.9rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { background: '#f4f4f4', padding: '12px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' },
    td: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize: '0.9rem' },
    tdSmall: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize: '0.85em', color: '#555' },
    tdCenter: { padding: '20px', border: '1px solid #ddd', textAlign: 'center', color: '#777' },
    statusSelect: { padding: '5px', borderRadius: '4px', border: '1px solid #ccc' },
    detailButton: { padding: '5px 10px', background: '#17a2b8', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '0.8rem' },
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
    buttonAction: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', background: '#007bff', color: 'white' },
    paginationControls: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    connectedBadge: {
        background: '#28a745',
        color: 'white',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
    },
    disconnectedBadge: {
        background: '#dc3545',
        color: 'white',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
    }
};