// Tệp: fnb-smart-menu-frontend/pages/checkout.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import Link from 'next/link';

// ICONS
const IconUser = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IconPhone = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const IconMap = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconTicket = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
const IconCrown = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC107"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"></path></svg>;

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
    const { cartItems, clearCart } = useCart();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    // Form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerNote, setCustomerNote] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('TIEU_CHUAN'); 
    const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');

    // Voucher & Points
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState('');
    const [pricing, setPricing] = useState({ 
        sub_total: 0, delivery_fee: 0, discount_amount: 0, 
        points_discount: 0, total_amount: 0, 
        user_points_available: 0, can_use_points: false 
    });
    
    // Checkbox dùng điểm
    const [usePoints, setUsePoints] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [voucherMsg, setVoucherMsg] = useState('');

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

    // HÀM XỬ LÝ VOUCHER
    const handleVoucherChange = (e) => {
        setVoucherCode(e.target.value.toUpperCase());
    };

    // TÍNH TOÁN GIÁ & ĐIỂM
    useEffect(() => {
        if (!isMounted || cartItems.length === 0) return;

        const runCalculation = async () => {
            setVoucherMsg('');
            try {
                const payload = {
                    items: cartItems.map(item => ({
                        product_id: parseInt(item.product_id),
                        quantity: parseInt(item.quantity),
                        options: Array.isArray(item.options) ? item.options.map(id => parseInt(id)) : []
                    })),
                    delivery_method: deliveryMethod,
                    voucher_code: voucherCode || null,
                    customer_phone: customerPhone, 
                    use_points: usePoints
                };

                const res = await fetch(`${apiUrl}/orders/calculate`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });

                if (!res.ok) return;
                const data = await res.json();
                setPricing(data);

                // Voucher Msg
                if (voucherCode) {
                    if (data.discount_amount > 0) {
                        setAppliedVoucher(voucherCode);
                        setVoucherMsg(`✅ Giảm voucher: ${data.discount_amount.toLocaleString()}đ`);
                    } else if (voucherCode.length > 3) {
                        setVoucherMsg('❌ Mã chưa đủ điều kiện hoặc không tồn tại.');
                        setAppliedVoucher('');
                    }
                } else { setAppliedVoucher(''); }

            } catch (err) { console.error(err); }
        };

        const timeoutId = setTimeout(runCalculation, 500);
        return () => clearTimeout(timeoutId);

    }, [cartItems, deliveryMethod, voucherCode, customerPhone, usePoints, isMounted]);

    const handleSubmitOrder = async () => {
        if (!customerName || !customerPhone) { alert("Vui lòng điền Tên và SĐT!"); return; }
        if (deliveryMethod === 'NHANH' && !customerAddress) { alert("Vui lòng nhập địa chỉ!"); return; }

        setIsSubmitting(true);
        localStorage.setItem('customer_info', JSON.stringify({ name: customerName, phone: customerPhone, address: customerAddress }));

        try {
            const payload = {
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: deliveryMethod === 'TIEU_CHUAN' ? 'Khách đến lấy' : customerAddress,
                customer_note: customerNote,
                payment_method: paymentMethod, 
                delivery_method: deliveryMethod,
                voucher_code: appliedVoucher || null,
                use_points: usePoints,
                table_id: null,
                items: cartItems.map(item => ({
                    product_id: parseInt(item.product_id),
                    quantity: parseInt(item.quantity),
                    note: item.note,
                    ordered_by: item.ordered_by,
                    options: Array.isArray(item.options) ? item.options.map(id => parseInt(id)) : []
                }))
            };

            const res = await fetch(`${apiUrl}/orders`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || "Lỗi"); }
            
            const orderData = await res.json();
            clearCart();
            router.push(`/order-success?id=${orderData.id}`);

        } catch (err) { alert(err.message); setIsSubmitting(false); }
    };

    if (!isMounted) return null;
    if (cartItems.length === 0) return <div style={{textAlign:'center', padding:'50px'}}><h2>Giỏ hàng trống</h2><Link href="/">Quay lại Menu</Link></div>;

    return (
        <div className="checkout-page">
            <Head><title>Thanh toán</title></Head>
            <div className="navbar">
                <div className="container">
                    <Link href="/" legacyBehavior><a className="back-link">← Quay lại</a></Link>
                    <h1>Xác nhận đơn hàng</h1>
                    <div style={{width: 60}}></div>
                </div>
            </div>

            <div className="container main-content">
                <div className="checkout-grid">
                    <div className="left-col">
                        <section className="card">
                            <h3 className="section-title">Cách thức nhận hàng</h3>
                            <div className="method-tabs">
                                <label className={`method-tab ${deliveryMethod === 'TIEU_CHUAN' ? 'active' : ''}`}>
                                    <input type="radio" checked={deliveryMethod === 'TIEU_CHUAN'} onChange={() => setDeliveryMethod('TIEU_CHUAN')} hidden />
                                    <span className="icon">🛍️</span>
                                    <div className="tab-info">
                                        <div className="tab-title">Đến lấy</div>
                                        <div className="tab-desc">Tại cửa hàng</div>
                                    </div>
                                    <span className="check-mark">✔</span>
                                </label>
                                <label className={`method-tab ${deliveryMethod === 'NHANH' ? 'active' : ''}`}>
                                    <input type="radio" checked={deliveryMethod === 'NHANH'} onChange={() => setDeliveryMethod('NHANH')} hidden />
                                    <span className="icon">🛵</span>
                                    <div className="tab-info">
                                        <div className="tab-title">Giao tận nơi</div>
                                        <div className="tab-desc">Tài xế giao tới</div>
                                    </div>
                                    <span className="check-mark">✔</span>
                                </label>
                            </div>
                        </section>

                        {/* --- KHỐI TÍCH ĐIỂM (HIỆN DIỆN TRỞ LẠI) --- */}
                        <section className="card loyalty-card">
                            <div className="loyalty-header">
                                <IconCrown /> 
                                <span style={{marginLeft: '10px'}}>Tích điểm thành viên</span>
                            </div>
                            <div className="loyalty-body">
                                <p>Nhập số điện thoại để tra cứu điểm:</p>
                                <div className="input-with-icon loyalty-input">
                                    <span className="input-icon"><IconPhone /></span>
                                    <input 
                                        type="tel" 
                                        placeholder="Nhập SĐT..." 
                                        value={customerPhone} 
                                        onChange={e => setCustomerPhone(e.target.value)} 
                                    />
                                </div>
                                
                                {/* HIỆN ĐIỂM NẾU CÓ */}
                                {pricing.user_points_available > 0 && (
                                    <div className="points-info">
                                        <div style={{color: '#b78900', fontWeight:'bold'}}>
                                            Bạn đang có: {pricing.user_points_available} điểm
                                        </div>
                                        <div style={{fontSize:'0.9rem', color:'#666', marginTop:'5px'}}>
                                            (Tương đương { (pricing.user_points_available * 500).toLocaleString() }đ)
                                        </div>
                                        
                                        <label className="use-points-checkbox">
                                            <input 
                                                type="checkbox" 
                                                checked={usePoints}
                                                onChange={(e) => setUsePoints(e.target.checked)}
                                            />
                                            <span>Dùng điểm để giảm giá ngay</span>
                                        </label>
                                    </div>
                                )}
                                
                                {customerPhone.length >= 10 && pricing.user_points_available === 0 && (
                                    <div style={{fontSize:'0.85rem', color:'#666', marginTop:'10px', fontStyle:'italic'}}>
                                        (Số điện thoại mới sẽ được bắt đầu tích điểm từ đơn này)
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card">
                            <h3 className="section-title">Thông tin giao nhận</h3>
                            <div className="form-group">
                                <div className="input-with-icon">
                                    <span className="input-icon"><IconUser /></span>
                                    <input type="text" placeholder="Tên người nhận" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                </div>
                            </div>
                            {deliveryMethod === 'NHANH' && (
                                <div className="form-group slide-down">
                                    <div className="input-with-icon">
                                        <span className="input-icon"><IconMap /></span>
                                        <input type="text" placeholder="Địa chỉ giao hàng" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <textarea className="note-input" placeholder="Ghi chú món ăn..." value={customerNote} onChange={e => setCustomerNote(e.target.value)} />
                            </div>
                        </section>

                        <section className="card">
                            <h3 className="section-title">Thanh toán</h3>
                            <div className="payment-list">
                                <label className={`payment-option ${paymentMethod === 'TIEN_MAT' ? 'selected' : ''}`}>
                                    <input type="radio" checked={paymentMethod === 'TIEN_MAT'} onChange={() => setPaymentMethod('TIEN_MAT')} hidden />
                                    <div className="pay-icon">💵</div>
                                    <div className="pay-info"><span className="pay-name">Tiền mặt</span></div>
                                    <div className="radio-circle"></div>
                                </label>
                                <label className={`payment-option ${paymentMethod === 'CHUYEN_KHOAN' ? 'selected' : ''}`}>
                                    <input type="radio" checked={paymentMethod === 'CHUYEN_KHOAN'} onChange={() => setPaymentMethod('CHUYEN_KHOAN')} hidden />
                                    <div className="pay-icon">💳</div>
                                    <div className="pay-info"><span className="pay-name">Chuyển khoản / VietQR</span></div>
                                    <div className="radio-circle"></div>
                                </label>
                            </div>
                        </section>
                    </div>

                    <div className="right-col">
                        <div className="sticky-wrapper">
                            <section className="card order-card">
                                <h3>Món đã chọn</h3>
                                <div className="order-items">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="order-item">
                                            <div className="qty-badge">{item.quantity}x</div>
                                            <div className="item-details">
                                                <div className="item-name">{item._display?.name}</div>
                                                <div className="item-opts">{item._display?.optionsText}</div>
                                            </div>
                                            <div className="item-price">{(item._display?.itemPrice * item.quantity).toLocaleString()}đ</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="voucher-section">
                                    <div className={`voucher-input-group ${voucherMsg.includes('✅') ? 'success' : voucherMsg.includes('❌') ? 'error' : ''}`}>
                                        <span className="v-icon"><IconTicket /></span>
                                        <input 
                                            placeholder="NHẬP MÃ GIẢM GIÁ" 
                                            value={voucherCode} 
                                            onChange={handleVoucherChange}
                                        />
                                    </div>
                                    {voucherMsg && <div className={`voucher-msg ${voucherMsg.includes('✅') ? 'success' : 'error'}`}>{voucherMsg}</div>}
                                </div>

                                <div className="bill-summary">
                                    <div className="bill-row"><span>Tạm tính</span><span>{pricing.sub_total.toLocaleString()}đ</span></div>
                                    <div className="bill-row"><span>Phí giao hàng</span><span>{pricing.delivery_fee > 0 ? `+${pricing.delivery_fee.toLocaleString()}đ` : '0đ'}</span></div>
                                    {pricing.discount_amount > 0 && <div className="bill-row discount"><span>Voucher giảm</span><span>-{pricing.discount_amount.toLocaleString()}đ</span></div>}
                                    
                                    {/* DÒNG GIẢM GIÁ TỪ ĐIỂM */}
                                    {pricing.points_discount > 0 && (
                                        <div className="bill-row discount" style={{color: '#b78900'}}>
                                            <span>Tiêu điểm thưởng</span>
                                            <span>-{pricing.points_discount.toLocaleString()}đ</span>
                                        </div>
                                    )}

                                    <div className="divider"></div>
                                    <div className="bill-row total"><span>Tổng cộng</span><span className="total-price">{pricing.total_amount.toLocaleString()}đ</span></div>
                                </div>

                                <button onClick={handleSubmitOrder} disabled={isSubmitting} className="btn-checkout">
                                    {isSubmitting ? 'Đang xử lý...' : 'ĐẶT HÀNG NGAY'}
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{` body { background-color: #f3f4f6; color: #333; font-family: sans-serif; } `}</style>
            <style jsx>{`
                .container { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
                .navbar { background: #fff; padding: 15px 0; border-bottom: 1px solid #eee; margin-bottom: 20px; }
                .navbar .container { display: flex; align-items: center; justify-content: space-between; }
                .back-link { text-decoration: none; font-weight: 600; color: #666; }
                .checkout-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
                .card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #ddd; }
                .section-title { margin-top: 0; margin-bottom: 15px; font-size: 1.1rem; font-weight: 700; }
                .loyalty-card { border: 2px solid #FFC107; background: #fffdf5; }
                .loyalty-header { display: flex; align-items: center; color: #b78900; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; }
                .loyalty-body p { margin: 0 0 10px 0; color: #555; font-size: 0.9rem; }
                .loyalty-input input { border-color: #FFC107; font-weight: bold; color: #333; font-size: 1.1rem; }
                .points-info { margin-top: 15px; padding: 10px; background: #fff; border-radius: 8px; border: 1px dashed #FFC107; }
                .use-points-checkbox { display: flex; align-items: center; margin-top: 10px; cursor: pointer; font-weight: bold; color: #b78900; }
                .use-points-checkbox input { width: 18px; height: 18px; margin-right: 10px; accent-color: #FFC107; }
                .method-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .method-tab { padding: 12px; border: 2px solid #eee; border-radius: 8px; cursor: pointer; text-align: center; font-weight: bold; }
                .method-tab.active { border-color: #FF6600; background: #fff5eb; color: #FF6600; }
                .form-group { margin-bottom: 15px; }
                .slide-down { animation: slideDown 0.3s ease-out; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .input-with-icon { position: relative; }
                .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #888; }
                input[type="text"], input[type="tel"] { width: 100%; padding: 12px 12px 12px 40px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; }
                input:focus { border-color: #FF6600; }
                .note-input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; min-height: 80px; }
                .payment-list { display: flex; gap: 10px; }
                .payment-option { flex: 1; padding: 12px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; text-align: center; }
                .payment-option.selected { border-color: #FF6600; background: #fff5eb; font-weight: bold; }
                .sticky-wrapper { position: sticky; top: 20px; }
                .order-items { max-height: 300px; overflow-y: auto; margin-bottom: 15px; }
                .order-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.95rem; }
                .qty-badge { font-weight: bold; margin-right: 10px; background: #eee; padding: 2px 6px; border-radius: 4px; }
                .item-details { flex: 1; }
                .item-price { font-weight: bold; }
                .item-opts { font-size: 0.8rem; color: #666; }
                .voucher-section { margin-bottom: 20px; }
                .voucher-input-group { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 8px; padding: 0 10px; background: #fff; }
                .voucher-input-group.success { border-color: #28a745; }
                .voucher-input-group.error { border-color: #dc3545; }
                .v-icon { color: #888; margin-right: 8px; }
                .voucher-input-group input { border: none; outline: none; width: 100%; padding: 10px 0; font-weight: bold; text-transform: uppercase; color: #333; }
                .voucher-msg { font-size: 0.85rem; margin-top: 5px; }
                .voucher-msg.success { color: #28a745; }
                .voucher-msg.error { color: #dc3545; }
                .bill-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; color: #555; }
                .bill-row.discount { color: #28a745; font-weight: bold; }
                .bill-row.total { font-weight: bold; font-size: 1.2rem; color: #FF6600; }
                .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
                .btn-checkout { width: 100%; padding: 15px; background: #FF6600; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-top: 10px; }
                .btn-checkout:disabled { opacity: 0.7; }
                @media (max-width: 768px) { .checkout-grid { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
}