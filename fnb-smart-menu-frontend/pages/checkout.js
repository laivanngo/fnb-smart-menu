// Tệp: fnb-smart-menu-frontend/pages/checkout.js
// (BẢN FINAL V3 - AUTO SAVE, AUTO VOUCHER, UX PRO)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import Link from 'next/link';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
    const { cartItems, clearCart } = useCart();
    const router = useRouter();
    
    const [isMounted, setIsMounted] = useState(false);

    // State form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNote, setCustomerNote] = useState('');
    
    // Logic mới: TIEU_CHUAN = Lấy tại quán (0đ), NHANH = Giao tận nơi (15k)
    const [deliveryMethod, setDeliveryMethod] = useState('NHANH'); 
    
    // Logic mới: Đổi MoMo thành Chuyển khoản (Backend đã hỗ trợ CHUYEN_KHOAN)
    const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');

    // State Voucher & Giá tiền
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState('');
    const [pricing, setPricing] = useState({
        sub_total: 0,
        delivery_fee: 0,
        discount_amount: 0,
        total_amount: 0
    });

    const [isCalculating, setIsCalculating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voucherError, setVoucherError] = useState('');

    // --- 1. TỰ ĐỘNG TẢI THÔNG TIN KHÁCH HÀNG CŨ ---
    useEffect(() => {
        setIsMounted(true);
        const savedInfo = localStorage.getItem('customer_info');
        if (savedInfo) {
            try {
                const info = JSON.parse(savedInfo);
                setCustomerName(info.name || '');
                setCustomerPhone(info.phone || '');
                setCustomerAddress(info.address || '');
            } catch (e) {}
        }
    }, []);

    // --- 2. TỰ ĐỘNG ÁP DỤNG VOUCHER (DEBOUNCE) ---
    useEffect(() => {
        if (!isMounted || cartItems.length === 0) return;

        // Hàm tính tiền nội bộ
        const runCalculation = async () => {
            setIsCalculating(true);
            setVoucherError('');
            try {
                const payload = {
                    items: cartItems.map(item => ({
                        product_id: parseInt(item.product_id),
                        quantity: parseInt(item.quantity),
                        options: Array.isArray(item.options) ? item.options.map(id => parseInt(id)) : []
                    })),
                    // Giao tận nơi (NHANH) thì tính phí, Lấy tại quán (TIEU_CHUAN) thì free
                    delivery_method: deliveryMethod,
                    voucher_code: voucherCode || null
                };

                const res = await fetch(`${apiUrl}/orders/calculate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("Lỗi tính tiền");
                
                const data = await res.json();
                setPricing(data);

                // Kiểm tra voucher trạng thái
                if (voucherCode) {
                    if (data.discount_amount > 0) {
                        setAppliedVoucher(voucherCode);
                        setVoucherError(''); // Xóa lỗi nếu thành công
                    } else {
                        // Chỉ báo lỗi nếu mã đã nhập đủ dài (tránh báo khi mới gõ 1 chữ)
                        if (voucherCode.length > 3) {
                            setVoucherError('Mã chưa đủ điều kiện hoặc không tồn tại.');
                        }
                        setAppliedVoucher('');
                    }
                } else {
                    setAppliedVoucher('');
                    setVoucherError('');
                }

            } catch (err) {
                console.error(err);
            } finally {
                setIsCalculating(false);
            }
        };

        // Kỹ thuật Debounce: Chờ khách ngừng gõ 0.5s mới tính tiền (đỡ lag server)
        const timeoutId = setTimeout(() => {
            runCalculation();
        }, 500);

        return () => clearTimeout(timeoutId);

    }, [cartItems, deliveryMethod, voucherCode, isMounted]); // Chạy lại khi voucherCode thay đổi

    // --- 3. XỬ LÝ NHẬP MÃ (TỰ ĐỘNG VIẾT HOA) ---
    const handleVoucherChange = (e) => {
        // Tự động chuyển thành chữ hoa ngay khi gõ
        setVoucherCode(e.target.value.toUpperCase());
    };

    // --- 4. ĐẶT HÀNG & LƯU THÔNG TIN ---
    const handleSubmitOrder = async () => {
        if (!customerName || !customerPhone) {
            alert("Vui lòng điền Tên và Số điện thoại!");
            return;
        }
        // Nếu giao tận nơi thì bắt buộc nhập địa chỉ
        if (deliveryMethod === 'NHANH' && !customerAddress) {
            alert("Vui lòng nhập địa chỉ giao hàng!");
            return;
        }

        setIsSubmitting(true);
        
        // ==> LƯU THÔNG TIN KHÁCH HÀNG VÀO MÁY <==
        localStorage.setItem('customer_info', JSON.stringify({
            name: customerName,
            phone: customerPhone,
            address: customerAddress
        }));

        try {
            const payload = {
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress || 'Lấy tại quán', // Nếu lấy tại quán thì không cần địa chỉ cụ thể
                customer_note: customerNote,
                payment_method: paymentMethod, // TIEN_MAT hoặc CHUYEN_KHOAN (Backend cũ map là MOMO, nhưng ta cứ gửi đúng logic)
                delivery_method: deliveryMethod,
                voucher_code: appliedVoucher || null,
                items: cartItems.map(item => ({
                    product_id: parseInt(item.product_id),
                    quantity: parseInt(item.quantity),
                    note: item.note,
                    ordered_by: item.ordered_by,
                    options: Array.isArray(item.options) ? item.options.map(id => parseInt(id)) : []
                }))
            };

            // Lưu ý: Nếu Backend chưa sửa Enum PaymentMethod thành CHUYEN_KHOAN, 
            // ta có thể phải map tạm 'CHUYEN_KHOAN' thành 'MOMO' để không bị lỗi 422.
            // Nhưng code Backend tôi đưa bạn đã có CHUYEN_KHOAN rồi nên yên tâm.
            if (payload.payment_method === 'CHUYEN_KHOAN') {
                 // Fallback an toàn: Nếu backend cũ chưa update Enum
                 // payload.payment_method = 'MOMO'; 
            }

            const res = await fetch(`${apiUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Đặt hàng thất bại");
            }
            
            const orderData = await res.json();
            clearCart();
            router.push(`/order-success?id=${orderData.id}`);

        } catch (err) {
            alert("Lỗi: " + err.message);
            setIsSubmitting(false);
        }
    };

    if (!isMounted) return null;

    if (cartItems.length === 0) {
        return (
            <div style={{padding: '50px', textAlign: 'center'}}>
                <h2>Giỏ hàng trống</h2>
                <Link href="/" style={{color: '#FF6600', textDecoration: 'none'}}>← Quay lại thực đơn</Link>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <Head><title>Thanh toán - Ngon Ngon</title></Head>
            <div style={styles.header}>
                <Link href="/" style={{textDecoration: 'none', fontSize: '1.5rem'}}>🛒 <b style={{color:'#FF6600'}}>Thanh toán</b></Link>
            </div>

            <div style={styles.grid}>
                {/* CỘT TRÁI: THÔNG TIN */}
                <div style={styles.leftCol}>
                    <h3>Thông tin khách hàng</h3>
                    <input style={styles.input} placeholder="Tên của bạn" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <input style={styles.input} placeholder="Số điện thoại" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    
                    <h3>Phương thức nhận hàng</h3>
                    <div style={styles.radioGroup}>
                        {/* ĐỔI LOGIC: LẤY TẠI QUÁN = MIỄN PHÍ SHIP */}
                        <label style={styles.radioLabel}>
                            <input type="radio" name="delivery" checked={deliveryMethod === 'TIEU_CHUAN'} onChange={() => setDeliveryMethod('TIEU_CHUAN')} /> 
                            🏪 <b>Lấy tại quán</b> (Không tốn ship)
                        </label>
                        
                        {/* ĐỔI LOGIC: GIAO TẬN NƠI = CÓ PHÍ SHIP */}
                        <label style={styles.radioLabel}>
                            <input type="radio" name="delivery" checked={deliveryMethod === 'NHANH'} onChange={() => setDeliveryMethod('NHANH')} /> 
                            🛵 <b>Giao tận nơi</b> (+15.000đ)
                        </label>
                    </div>

                    {/* Chỉ hiện ô nhập địa chỉ khi chọn Giao tận nơi */}
                    {deliveryMethod === 'NHANH' && (
                        <div style={{animation: 'fadeIn 0.3s'}}>
                            <input style={styles.input} placeholder="Địa chỉ nhận hàng (Số nhà, Tên đường...)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                        </div>
                    )}
                    
                    <textarea style={{...styles.input, height: '80px'}} placeholder="Ghi chú thêm (ít đá, nhiều đường...)" value={customerNote} onChange={e => setCustomerNote(e.target.value)} />

                    <h3>Phương thức thanh toán</h3>
                    <div style={styles.radioGroup}>
                        <label style={styles.radioLabel}>
                            <input type="radio" name="payment" checked={paymentMethod === 'TIEN_MAT'} onChange={() => setPaymentMethod('TIEN_MAT')} /> 
                            💵 Tiền mặt
                        </label>
                        <label style={styles.radioLabel}>
                            {/* DÙNG VALUE LÀ CHUYEN_KHOAN ĐỂ KHỚP BACKEND */}
                            <input type="radio" name="payment" checked={paymentMethod === 'CHUYEN_KHOAN'} onChange={() => setPaymentMethod('CHUYEN_KHOAN')} /> 
                            💳 <b>Chuyển khoản</b> (VietQR)
                        </label>
                    </div>
                </div>

                {/* CỘT PHẢI: ĐƠN HÀNG */}
                <div style={styles.rightCol}>
                    <h3>Đơn hàng ({cartItems.length} món)</h3>
                    <div style={styles.itemList}>
                        {cartItems.map((item, idx) => (
                            <div key={idx} style={styles.item}>
                                <div>
                                    <span style={{fontWeight:'bold'}}>{item.quantity}x</span> 
                                    <span style={{marginLeft: '5px'}}>{item._display?.name}</span>
                                    <div style={{fontSize:'0.85rem', color:'#666'}}>
                                        {item._display?.optionsText}
                                    </div>
                                    {item.orderedBy && <small style={{color:'#FF6600'}}>Người đặt: {item.orderedBy}</small>}
                                </div>
                                <div>{(item._display?.itemPrice * item.quantity).toLocaleString()}đ</div>
                            </div>
                        ))}
                    </div>

                    {/* VOUCHER INPUT - ĐÃ TỐI ƯU */}
                    <div style={styles.voucherBox}>
                        <input 
                            style={styles.voucherInput} 
                            placeholder="Mã giảm giá (Ví dụ: GIAM10)" 
                            value={voucherCode}
                            onChange={handleVoucherChange} // Tự động viết hoa
                        />
                        {/* Nút này giờ chỉ để trang trí hoặc force check, vì hệ thống đã tự check */}
                        <button style={{...styles.applyButton, opacity: isCalculating ? 0.5 : 1}}>
                            {isCalculating ? 'Checking...' : '🏷️'}
                        </button>
                    </div>
                    {voucherError && <p style={{color: 'red', fontSize: '0.85rem', marginTop: '5px'}}>⚠️ {voucherError}</p>}
                    {appliedVoucher && <p style={{color: 'green', fontSize: '0.9rem', marginTop: '5px', fontWeight:'bold'}}>🎉 Đã áp dụng mã: {appliedVoucher}</p>}

                    <hr style={{borderTop: '1px dashed #ddd', margin: '20px 0'}} />
                    
                    <div style={styles.row}><span>Tạm tính:</span> <span>{pricing.sub_total.toLocaleString()}đ</span></div>
                    <div style={styles.row}>
                        <span>Phí giao hàng:</span> 
                        <span>{pricing.delivery_fee > 0 ? pricing.delivery_fee.toLocaleString()+'đ' : 'Miễn phí'}</span>
                    </div>
                    {pricing.discount_amount > 0 && (
                        <div style={{...styles.row, color: 'green', fontWeight: 'bold'}}>
                            <span>Giảm giá:</span> <span>-{pricing.discount_amount.toLocaleString()}đ</span>
                        </div>
                    )}
                    
                    <div style={{...styles.row, fontSize: '1.2rem', marginTop: '15px', color: '#FF6600', borderTop:'2px solid #eee', paddingTop:'10px'}}>
                        <span>Tổng cộng:</span> 
                        <span>{pricing.total_amount.toLocaleString()}đ</span>
                    </div>

                    <button onClick={handleSubmitOrder} style={styles.checkoutButton} disabled={isSubmitting}>
                        {isSubmitting ? 'ĐANG XỬ LÝ...' : '🚀 ĐẶT HÀNG NGAY'}
                    </button>
                </div>
            </div>
            
            {/* Style động cho animation */}
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

const styles = {
    container: { maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" },
    header: { marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' },
    leftCol: {},
    rightCol: { background: '#fff', padding: '25px', borderRadius: '16px', height: 'fit-content', border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
    input: { display: 'block', width: '100%', padding: '14px', marginBottom: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize:'1rem', transition: 'border 0.2s', outline:'none' },
    radioGroup: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px' },
    radioLabel: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid #eee', borderRadius: '8px', transition: 'all 0.2s', backgroundColor: '#fafafa' },
    itemList: { marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' },
    item: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #eee', paddingBottom: '12px' },
    
    voucherBox: { display: 'flex', gap: '10px', alignItems: 'center', background: '#f9f9f9', padding: '5px', borderRadius: '8px', border: '1px solid #eee' },
    voucherInput: { flex: 1, padding: '10px', border: 'none', background: 'transparent', outline: 'none', fontWeight: '600', textTransform: 'uppercase', color: '#333' },
    applyButton: { padding: '8px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1.2rem' },
    
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: '500', color: '#555' },
    checkoutButton: { width: '100%', padding: '16px', background: 'linear-gradient(to right, #FF6600, #FF8800)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', marginTop: '25px', boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)', transition: 'transform 0.1s' },
};

styles.grid['@media (max-width: 768px)'] = { gridTemplateColumns: '1fr' };
// Focus style
styles.radioLabel[':hover'] = { borderColor: '#FF6600', backgroundColor: '#fff5eb' };