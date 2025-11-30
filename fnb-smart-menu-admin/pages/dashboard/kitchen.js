// Tệp: fnb-smart-menu-frontend/pages/dashboard/kitchen.js
// (BẢN FINAL V4 - KẾT NỐI BÊ TÔNG & FIX LỖI URL)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const NOTIFICATION_SOUND = '/tayduky.mp3';

export default function KitchenBoard() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    
    // Trạng thái hiển thị trên màn hình
    const [statusText, setStatusText] = useState('Đang kết nối...');
    const [isOnline, setIsOnline] = useState(false);
    
    // Refs để giữ kết nối ổn định
    const ws = useRef(null);
    const audioRef = useRef(null);
    const reconnectTimeout = useRef(null);
    
    const activeStatuses = ["MOI", "DA_XAC_NHAN", "DANG_CHUAN_BI"]; 

    // --- 1. KHỞI TẠO ÂM THANH ---
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.load();
    }, []);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => {
                console.warn("Chưa thể phát tiếng (Cần tương tác):", err);
            });
        }
    };

    // --- 2. TẢI DỮ LIỆU (HTTP) ---
    const fetchOrders = useCallback(async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) { router.replace('/login'); return; }

        try {
            const res = await fetch(`${apiUrl}/admin/orders/?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                localStorage.removeItem('admin_token'); 
                router.push('/login'); 
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                const activeOrders = data.filter(o => activeStatuses.includes(o.status));
                activeOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                setOrders(activeOrders);
            }
        } catch (err) {
            console.error("Lỗi tải đơn:", err);
        }
    }, [router]);

    // Gọi lần đầu
    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // --- 3. KẾT NỐI WEBSOCKET (ĐÃ SỬA LỖI URL & RECONNECT) ---
    useEffect(() => {
        const connectWebSocket = () => {
            const token = localStorage.getItem('admin_token');
            if (!token) return;

            // Xử lý URL chuẩn xác (Xóa dấu / ở cuối nếu có để tránh lỗi //ws)
            let cleanApiUrl = apiUrl;
            if (cleanApiUrl.endsWith('/')) {
                cleanApiUrl = cleanApiUrl.slice(0, -1);
            }

            let wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            const hostname = cleanApiUrl.replace('http://', '').replace('https://', '');
            const wsUrl = `${wsProtocol}${hostname}/ws/admin/orders`;

            console.log("🔌 KDS đang thử kết nối tới:", wsUrl);
            
            // Đóng kết nối cũ nếu còn sót lại
            if (ws.current) {
                ws.current.close();
            }

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("✅ KDS Đã kết nối thành công!");
                setIsOnline(true);
                setStatusText("● Online");
                fetchOrders(); // Tải lại đơn ngay khi có mạng
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Chỉ báo chuông khi có đơn mới
                    if (data.type === 'new_order') {
                        console.log("🔔 CÓ ĐƠN MỚI!", data);
                        playNotificationSound();
                        fetchOrders();
                    }
                } catch (e) { console.error("Lỗi đọc tin nhắn WS", e); }
            };

            ws.current.onclose = () => {
                console.log("❌ Mất kết nối. Thử lại sau 3s...");
                setIsOnline(false);
                setStatusText("○ Mất kết nối (Đang thử lại...)");
                
                // Tự động kết nối lại sau 3 giây
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
            };

            ws.current.onerror = (err) => {
                console.error("⚠️ Lỗi WebSocket:", err);
                ws.current.close();
            };
        };

        connectWebSocket();

        // Dọn dẹp khi thoát trang
        return () => {
            if (ws.current) ws.current.close();
            clearTimeout(reconnectTimeout.current);
        };
    }, [fetchOrders]); // Chỉ chạy 1 lần khi mount (nhờ logic ref)

    // --- 4. XỬ LÝ TRẠNG THÁI ---
    const updateStatus = async (orderId, nextStatus) => {
        const token = localStorage.getItem('admin_token');
        // Optimistic Update
        const oldOrders = [...orders];
        if (nextStatus === 'HOAN_TAT' || nextStatus === 'DA_XONG') {
            setOrders(orders.filter(o => o.id !== orderId));
        } else {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
        }

        try {
            await fetch(`${apiUrl}/admin/orders/${orderId}/status?status=${nextStatus}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchOrders();
        } catch (err) {
            alert("Lỗi cập nhật: " + err.message);
            setOrders(oldOrders);
        }
    };

    const getElapsedTime = (dateString) => {
        const minutes = Math.floor((new Date() - new Date(dateString)) / 60000);
        if (minutes < 1) return 'Vừa xong';
        return `${minutes} phút trước`;
    };

    return (
        <div style={styles.container}>
            <Head><title>KDS - Bếp & Pha chế</title></Head>
            
            {/* HEADER */}
            <div style={styles.header}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <h1 style={{margin:0, color:'white'}}>👨‍🍳 BẾP & PHA CHẾ</h1>
                    
                    {/* TRẠNG THÁI KẾT NỐI */}
                    <div style={{
                        padding: '5px 15px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold',
                        background: isOnline ? '#28a745' : '#dc3545',
                        color: 'white', transition: 'all 0.3s'
                    }}>
                        {statusText}
                    </div>

                    <button onClick={playNotificationSound} style={styles.testBtn}>
                        🔊 Test Loa
                    </button>
                </div>

                <div style={{color:'white', fontWeight:'bold', fontSize:'1.2rem'}}>
                    Đang chờ: {orders.length}
                </div>
            </div>

            {/* DANH SÁCH ĐƠN HÀNG */}
            <div style={styles.grid}>
                {orders.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p>Hiện tại không có đơn hàng nào cần làm.</p>
                        <p style={{fontSize:'1rem', marginTop:'10px'}}>Tranh thủ nghỉ ngơi nhé! ☕</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <OrderCard 
                            key={order.id} 
                            order={order} 
                            elapsed={getElapsedTime(order.created_at)}
                            onNextStatus={updateStatus}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// --- COMPONENT THẺ ĐƠN HÀNG ---
function OrderCard({ order, elapsed, onNextStatus }) {
    let cardStyle = styles.cardNew;
    let statusText = "MỚI";
    let nextAction = { text: "NHẬN ĐƠN", status: "DA_XAC_NHAN", color: "#007bff" };

    if (order.status === 'DA_XAC_NHAN') {
        cardStyle = styles.cardConfirmed;
        statusText = "CHỜ CHẾ BIẾN";
        nextAction = { text: "▶ BẮT ĐẦU LÀM", status: "DANG_CHUAN_BI", color: "#FF6600" };
    } 
    else if (order.status === 'DANG_CHUAN_BI') { 
        cardStyle = styles.cardProcessing;
        statusText = "ĐANG LÀM...";
        nextAction = { text: "✅ HOÀN TẤT", status: "HOAN_TAT", color: "#28a745" }; 
    }

    const isLate = elapsed.includes("phút") && parseInt(elapsed) > 15;
    
    return (
        <div style={{...styles.card, ...cardStyle, border: isLate ? '4px solid #dc3545' : '1px solid #ddd'}}>
            {/* Header Card */}
            <div style={styles.cardHeader}>
                <span style={styles.orderId}>#{order.id}</span>
                <span style={{...styles.timer, color: isLate ? '#dc3545' : '#666'}}>
                    {isLate ? '⚠️ ' : ''}{elapsed}
                </span>
            </div>

            {/* Thông tin khách */}
            <div style={styles.customerInfo}>
                <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{order.customer_name}</div>
                <div style={{fontSize:'0.9rem', color:'#555'}}>
                    {order.delivery_method_selected === 'NHANH' ? '🛵 Giao đi' : '🏪 Tại quán'}
                </div>
                {order.customer_note && (
                    <div style={styles.note}>📝 {order.customer_note}</div>
                )}
            </div>

            {/* Danh sách món */}
            <div style={styles.itemList}>
                {order.items && order.items.map((item, idx) => (
                    <div key={idx} style={styles.item}>
                        <div style={styles.qtyCircle}>{item.quantity}</div>
                        <div style={{flex:1}}>
                            <div style={styles.itemName}>{item.product_name}</div>
                            {/* Topping */}
                            {item.options_selected && item.options_selected.length > 0 && (
                                <div style={styles.options}>
                                    {item.options_selected.map(o => `+ ${o.value_name}`).join(', ')}
                                </div>
                            )}
                            {item.item_note && <div style={styles.itemNote}>Lưu ý: {item.item_note}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Nút hành động */}
            <button 
                style={{...styles.actionBtn, backgroundColor: nextAction.color}}
                onClick={() => onNextStatus(order.id, nextAction.status)}
            >
                {nextAction.text}
            </button>
        </div>
    );
}

// --- CSS ---
const styles = {
    container: { minHeight: '100vh', backgroundColor: '#222', fontFamily: 'sans-serif' },
    
    header: { 
        backgroundColor: '#333', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #444', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
    },
    testBtn: { padding:'6px 15px', background:'#6610f2', border:'none', color:'white', borderRadius:'20px', cursor:'pointer', fontWeight:'bold', fontSize:'0.9rem' },

    grid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', // Card to hơn chút cho dễ nhìn
        gap: '20px', padding: '20px'
    },
    emptyState: { color: '#888', textAlign: 'center', marginTop: '100px', fontSize: '1.5rem', width: '100%', fontStyle:'italic' },

    // Card Styles
    card: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 8px rgba(0,0,0,0.3)', height: '450px' }, // Card cao cố định
    cardNew: { borderTop: '8px solid #007bff' }, 
    cardConfirmed: { borderTop: '8px solid #FF6600' }, 
    cardProcessing: { borderTop: '8px solid #ffc107', backgroundColor: '#fffbe6' }, 

    cardHeader: { padding: '12px 15px', backgroundColor: '#f1f3f5', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    orderId: { fontSize: '1.3rem', fontWeight: '900', color: '#212529' },
    timer: { fontSize: '1rem', color: '#495057', fontWeight: 'bold' },

    customerInfo: { padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#fff' },
    note: { backgroundColor: '#fff3cd', color: '#856404', padding: '8px', borderRadius: '6px', marginTop: '8px', fontWeight: 'bold', border:'1px solid #ffeeba' },

    itemList: { flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#fff' },
    item: { display: 'flex', gap: '12px', marginBottom: '15px', alignItems: 'flex-start' },
    qtyCircle: { width: '35px', height: '35px', backgroundColor: '#212529', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 },
    itemName: { fontWeight: '700', fontSize: '1.1rem', lineHeight: '1.3', color:'#212529' },
    options: { fontSize: '0.95rem', color: '#666', marginTop: '4px' },
    itemNote: { fontSize: '0.9rem', color: '#dc3545', fontStyle: 'italic', fontWeight: 'bold', marginTop:'2px' },

    actionBtn: { width: '100%', padding: '18px', border: 'none', color: 'white', fontWeight: '800', fontSize: '1.3rem', cursor: 'pointer', transition: 'filter 0.2s', letterSpacing:'1px' }
};