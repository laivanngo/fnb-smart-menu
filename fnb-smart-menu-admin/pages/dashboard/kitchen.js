// Tệp: kitchen.js (BẢN FINAL - CÓ PING GIỮ KẾT NỐI VPS)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const NOTIFICATION_SOUND = '/tayduky.mp3';

export default function KitchenBoard() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [statusText, setStatusText] = useState('Đang kết nối...');
    const [isOnline, setIsOnline] = useState(false);
    
    const ws = useRef(null);
    const audioRef = useRef(null);
    const reconnectTimeout = useRef(null);
    const pingInterval = useRef(null); // <--- THÊM BIẾN PING
    
    const activeStatuses = ["MOI", "DA_XAC_NHAN", "DANG_CHUAN_BI"]; 

    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.load();
    }, []);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => console.warn("Cần tương tác để phát nhạc"));
        }
    };

    const fetchOrders = useCallback(async () => {
        const token = localStorage.getItem('admin_token');
        if (!token) { router.replace('/login'); return; }
        try {
            const res = await fetch(`${apiUrl}/admin/orders/?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem('admin_token'); router.push('/login'); return;
            }
            if (res.ok) {
                const data = await res.json();
                const activeOrders = data.filter(o => activeStatuses.includes(o.status));
                activeOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                setOrders(activeOrders);
            }
        } catch (err) { console.error(err); }
    }, [router]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // --- KẾT NỐI WEBSOCKET ---
    useEffect(() => {
        const connectWebSocket = () => {
            const token = localStorage.getItem('admin_token');
            if (!token) return;

            let cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
            let wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            const hostname = cleanApiUrl.replace('http://', '').replace('https://', '');
            const wsUrl = `${wsProtocol}${hostname}/ws/admin/orders`;

            console.log("🔌 Kết nối tới:", wsUrl);
            if (ws.current) ws.current.close();

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log("✅ Đã kết nối KDS!");
                setIsOnline(true);
                setStatusText("● Online");
                fetchOrders();
                
                // --- CƠ CHẾ PING (GIỮ KẾT NỐI) ---
                // Cứ 25 giây gửi tin nhắn 'ping' lên server để server không cắt kết nối
                clearInterval(pingInterval.current);
                pingInterval.current = setInterval(() => {
                    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                        ws.current.send("ping");
                    }
                }, 25000);
            };

            ws.current.onmessage = (event) => {
                try {
                    // Bỏ qua tin nhắn phản hồi ping (nếu có)
                    if (event.data === 'pong') return;

                    const data = JSON.parse(event.data);
                    if (data.type === 'new_order') {
                        console.log("🔔 ĐƠN MỚI!");
                        playNotificationSound();
                        fetchOrders();
                    }
                } catch (e) {}
            };

            ws.current.onclose = () => {
                console.log("❌ Mất kết nối. Thử lại...");
                setIsOnline(false);
                setStatusText("○ Đang nối lại...");
                clearInterval(pingInterval.current);
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
            };
        };

        connectWebSocket();
        return () => {
            if (ws.current) ws.current.close();
            clearInterval(pingInterval.current);
            clearTimeout(reconnectTimeout.current);
        };
    }, [fetchOrders]);

    // ... (Phần render giữ nguyên như cũ, tôi rút gọn để tiết kiệm không gian)
    // ... Copy phần return (...) từ file cũ hoặc file local của bạn vào đây
    // ... Đảm bảo giữ nguyên logic updateStatus và giao diện OrderCard
    
    // (Dưới đây là phần code hiển thị tóm tắt để bạn ghép vào)
    const updateStatus = async (orderId, nextStatus) => {
        const token = localStorage.getItem('admin_token');
        try {
            await fetch(`${apiUrl}/admin/orders/${orderId}/status?status=${nextStatus}`, {
                method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchOrders();
        } catch (err) { alert(err.message); }
    };

    const getElapsedTime = (dateString) => {
        const minutes = Math.floor((new Date() - new Date(dateString)) / 60000);
        return minutes < 1 ? 'Vừa xong' : `${minutes} phút trước`;
    };

    return (
        <div style={styles.container}>
            <Head><title>KDS - Bếp</title></Head>
            <div style={styles.header}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <h1 style={{margin:0, color:'white'}}>👨‍🍳 BẾP & PHA CHẾ</h1>
                    <div style={{padding:'5px 15px', borderRadius:'20px', background: isOnline ? '#28a745':'#dc3545', color:'white', fontWeight:'bold', fontSize:'0.9rem'}}>{statusText}</div>
                    <button onClick={playNotificationSound} style={styles.testBtn}>🔊 Test Loa</button>
                </div>
                <div style={{color:'white', fontWeight:'bold', fontSize:'1.2rem'}}>Đang chờ: {orders.length}</div>
            </div>
            <div style={styles.grid}>
                {orders.length === 0 ? <div style={styles.emptyState}>Hiện tại không có đơn hàng.</div> : 
                    orders.map(order => <OrderCard key={order.id} order={order} elapsed={getElapsedTime(order.created_at)} onNextStatus={updateStatus} />)
                }
            </div>
        </div>
    );
}

// ... (Copy các component OrderCard và styles từ file kitchen.js cũ vào đây)
// Đừng quên component OrderCard và object styles nhé!
function OrderCard({ order, elapsed, onNextStatus }) {
    let cardStyle = styles.cardNew;
    let nextAction = { text: "NHẬN ĐƠN", status: "DA_XAC_NHAN", color: "#007bff" };
    if (order.status === 'DA_XAC_NHAN') { cardStyle = styles.cardConfirmed; nextAction = { text: "▶ BẮT ĐẦU LÀM", status: "DANG_CHUAN_BI", color: "#FF6600" }; } 
    else if (order.status === 'DANG_CHUAN_BI') { cardStyle = styles.cardProcessing; nextAction = { text: "✅ HOÀN TẤT", status: "HOAN_TAT", color: "#28a745" }; }
    
    return (
        <div style={{...styles.card, ...cardStyle}}>
            <div style={styles.cardHeader}><span style={styles.orderId}>#{order.id}</span><span style={styles.timer}>{elapsed}</span></div>
            <div style={styles.customerInfo}><strong>{order.customer_name}</strong> - {order.delivery_method_selected === 'NHANH' ? 'Giao đi' : 'Tại quán'}</div>
            <div style={styles.itemList}>{order.items?.map((item, i) => <div key={i} style={styles.item}><b>{item.quantity}</b> {item.product_name} <br/><small>{item.options_selected?.map(o=>o.value_name).join(', ')}</small></div>)}</div>
            <button style={{...styles.actionBtn, background: nextAction.color}} onClick={()=>onNextStatus(order.id, nextAction.status)}>{nextAction.text}</button>
        </div>
    )
}

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#222', fontFamily: 'sans-serif' },
    header: { backgroundColor: '#333', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', position: 'sticky', top: 0, zIndex: 100 },
    testBtn: { padding:'6px 15px', background:'#6610f2', border:'none', color:'white', borderRadius:'20px', cursor:'pointer', fontWeight:'bold' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' },
    emptyState: { color: '#888', textAlign: 'center', marginTop: '100px', fontSize: '1.5rem', width: '100%' },
    card: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '400px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
    cardNew: { borderTop: '8px solid #007bff' }, cardConfirmed: { borderTop: '8px solid #FF6600' }, cardProcessing: { borderTop: '8px solid #ffc107', background: '#fffbe6' },
    cardHeader: { padding: '12px', background: '#f1f3f5', display: 'flex', justifyContent: 'space-between', fontWeight:'bold' },
    orderId: { fontSize: '1.2rem' }, timer: { color: '#666' },
    customerInfo: { padding: '15px', borderBottom: '1px solid #eee' },
    itemList: { flex: 1, padding: '15px', overflowY: 'auto' },
    item: { marginBottom: '10px', borderBottom:'1px dashed #eee', paddingBottom:'5px' },
    actionBtn: { width: '100%', padding: '15px', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }
};