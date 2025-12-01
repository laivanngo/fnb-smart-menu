// Tệp: fnb-smart-menu-frontend/pages/checkout.js
// (BẢN FINAL V3 - AUTO SAVE, AUTO VOUCHER, UX PRO - RESTYLED)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCart } from '../context/CartContext';
import Link from 'next/link';

// --- ICONS (SVG Components để không cần cài thư viện ngoài) ---
const IconUser = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const IconPhone = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const IconMap = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconBike = () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>; // Dùng tạm icon giỏ hàng cho bike demo
const IconStore = () => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 100-4 2 2 0 000 4zm-4-4H5V5h14v6H9v4z" /></svg>; // Icon tượng trưng
const IconTicket = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
    // ==========================================
    // LOGIC GIỮ NGUYÊN 100% TỪ FILE GỐC
    // ==========================================
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

                if (voucherCode) {
                    if (data.discount_amount > 0) {
                        setAppliedVoucher(voucherCode);
                        setVoucherError(''); 
                    } else {
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

        const timeoutId = setTimeout(() => {
            runCalculation();
        }, 500);

        return () => clearTimeout(timeoutId);

    }, [cartItems, deliveryMethod, voucherCode, isMounted]);

    // --- 3. XỬ LÝ NHẬP MÃ (TỰ ĐỘNG VIẾT HOA) ---
    const handleVoucherChange = (e) => {
        setVoucherCode(e.target.value.toUpperCase());
    };

    // --- 4. ĐẶT HÀNG & LƯU THÔNG TIN ---
    const handleSubmitOrder = async () => {
        if (!customerName || !customerPhone) {
            alert("Vui lòng điền Tên và Số điện thoại!");
            return;
        }
        if (deliveryMethod === 'NHANH' && !customerAddress) {
            alert("Vui lòng nhập địa chỉ giao hàng!");
            return;
        }

        setIsSubmitting(true);
        
        localStorage.setItem('customer_info', JSON.stringify({
            name: customerName,
            phone: customerPhone,
            address: customerAddress
        }));

        try {
            const payload = {
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress || 'Lấy tại quán', 
                customer_note: customerNote,
                payment_method: paymentMethod, 
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

    // ==========================================
    // UI RESTYLING SECTION
    // ==========================================

    if (!isMounted) return null;

    if (cartItems.length === 0) {
        return (
            <div className="empty-cart-container">
                <img src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png" alt="Empty Cart" width="120" />
                <h2>Giỏ hàng đang trống</h2>
                <p>Bạn chưa chọn món ăn nào. Hãy quay lại menu nhé!</p>
                <Link href="/" legacyBehavior>
                    <a className="btn-primary">Quay lại thực đơn</a>
                </Link>
                {/* Styles cho màn hình trống */}
                <style jsx>{`
                    .empty-cart-container {
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        min-height: 60vh; text-align: center; font-family: 'Segoe UI', sans-serif;
                    }
                    h2 { margin: 20px 0 10px; color: #333; }
                    p { color: #666; margin-bottom: 30px; }
                    .btn-primary {
                        padding: 12px 30px; background: #FF6600; color: white; 
                        text-decoration: none; border-radius: 50px; font-weight: 600;
                        box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <Head><title>Thanh toán - Ngon Ngon</title></Head>

            {/* Top Navigation Mobile-like */}
            <div className="navbar">
                <div className="container">
                    <Link href="/" legacyBehavior><a className="back-link">← Quay lại</a></Link>
                    <h1>Xác nhận đơn hàng</h1>
                    <div style={{width: 60}}></div> {/* Spacer */}
                </div>
            </div>

            <div className="container main-content">
                <div className="checkout-grid">
                    
                    {/* LEFT COLUMN: INFORMATION */}
                    <div className="left-col">
                        
                        {/* SECTION 1: DELIVERY METHOD */}
                        <section className="card">
                            <h3 className="section-title">Cách thức nhận hàng</h3>
                            <div className="method-tabs">
                                <label className={`method-tab ${deliveryMethod === 'NHANH' ? 'active' : ''}`}>
                                    <input type="radio" name="delivery" checked={deliveryMethod === 'NHANH'} onChange={() => setDeliveryMethod('NHANH')} hidden />
                                    <span className="icon">🛵</span>
                                    <div>
                                        <div className="tab-title">Giao tận nơi</div>
                                        <div className="tab-desc">Tài xế giao tới</div>
                                    </div>
                                    <span className="check-mark">✔</span>
                                </label>
                                <label className={`method-tab ${deliveryMethod === 'TIEU_CHUAN' ? 'active' : ''}`}>
                                    <input type="radio" name="delivery" checked={deliveryMethod === 'TIEU_CHUAN'} onChange={() => setDeliveryMethod('TIEU_CHUAN')} hidden />
                                    <span className="icon">🏪</span>
                                    <div>
                                        <div className="tab-title">Đến lấy</div>
                                        <div className="tab-desc">Tại cửa hàng</div>
                                    </div>
                                    <span className="check-mark">✔</span>
                                </label>
                            </div>
                        </section>

                        {/* SECTION 2: CUSTOMER INFO */}
                        <section className="card">
                            <h3 className="section-title">Thông tin giao nhận</h3>
                            <div className="form-group">
                                <div className="input-with-icon">
                                    <span className="input-icon"><IconUser /></span>
                                    <input 
                                        type="text" 
                                        placeholder="Họ và tên người nhận" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <div className="input-with-icon">
                                    <span className="input-icon"><IconPhone /></span>
                                    <input 
                                        type="tel" 
                                        placeholder="Số điện thoại" 
                                        value={customerPhone} 
                                        onChange={e => setCustomerPhone(e.target.value)} 
                                    />
                                </div>
                            </div>

                            {/* Address Input Animation */}
                            <div className={`address-wrapper ${deliveryMethod === 'NHANH' ? 'expanded' : ''}`}>
                                <div className="form-group">
                                    <div className="input-with-icon">
                                        <span className="input-icon"><IconMap /></span>
                                        <input 
                                            type="text" 
                                            placeholder="Địa chỉ chi tiết (Số nhà, đường, phường...)" 
                                            value={customerAddress} 
                                            onChange={e => setCustomerAddress(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <textarea 
                                    className="note-input"
                                    placeholder="Ghi chú cho quán (Ví dụ: Không hành, nhiều cay...)" 
                                    value={customerNote} 
                                    onChange={e => setCustomerNote(e.target.value)} 
                                />
                            </div>
                        </section>

                        {/* SECTION 3: PAYMENT */}
                        <section className="card">
                            <h3 className="section-title">Thanh toán</h3>
                            <div className="payment-list">
                                <label className={`payment-option ${paymentMethod === 'TIEN_MAT' ? 'selected' : ''}`}>
                                    <input type="radio" name="payment" checked={paymentMethod === 'TIEN_MAT'} onChange={() => setPaymentMethod('TIEN_MAT')} hidden />
                                    <div className="pay-icon">💵</div>
                                    <div className="pay-info">
                                        <span className="pay-name">Tiền mặt</span>
                                        <span className="pay-desc">Thanh toán khi nhận hàng</span>
                                    </div>
                                    <div className="radio-circle"></div>
                                </label>
                                <label className={`payment-option ${paymentMethod === 'CHUYEN_KHOAN' ? 'selected' : ''}`}>
                                    <input type="radio" name="payment" checked={paymentMethod === 'CHUYEN_KHOAN'} onChange={() => setPaymentMethod('CHUYEN_KHOAN')} hidden />
                                    <div className="pay-icon">💳</div>
                                    <div className="pay-info">
                                        <span className="pay-name">Chuyển khoản / VietQR</span>
                                        <span className="pay-desc">Quét mã QR nhanh chóng</span>
                                    </div>
                                    <div className="radio-circle"></div>
                                </label>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: ORDER SUMMARY */}
                    <div className="right-col">
                        <div className="sticky-wrapper">
                            <section className="card order-card">
                                <div className="card-header">
                                    <h3>Món ăn đã chọn ({cartItems.length})</h3>
                                    <Link href="/" legacyBehavior><a className="edit-link">Thêm món</a></Link>
                                </div>
                                
                                <div className="order-items">
                                    {cartItems.map((item, idx) => (
                                        <div key={idx} className="order-item">
                                            <div className="qty-badge">{item.quantity}x</div>
                                            <div className="item-details">
                                                <div className="item-name">{item._display?.name}</div>
                                                <div className="item-opts">{item._display?.optionsText}</div>
                                                {item.orderedBy && <div className="item-user">Đặt bởi: {item.orderedBy}</div>}
                                            </div>
                                            <div className="item-price">
                                                {(item._display?.itemPrice * item.quantity).toLocaleString()}đ
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Voucher Section */}
                                <div className="voucher-section">
                                    <div className={`voucher-input-group ${voucherError ? 'error' : ''} ${appliedVoucher ? 'success' : ''}`}>
                                        <span className="v-icon"><IconTicket /></span>
                                        <input 
                                            placeholder="Nhập mã giảm giá" 
                                            value={voucherCode}
                                            onChange={handleVoucherChange}
                                        />
                                        {isCalculating && <div className="spinner-mini"></div>}
                                    </div>
                                    {voucherError && <div className="msg-error">{voucherError}</div>}
                                    {appliedVoucher && <div className="msg-success">Đã áp dụng mã: <b>{appliedVoucher}</b></div>}
                                </div>

                                {/* Bill Summary */}
                                <div className="bill-summary">
                                    <div className="bill-row">
                                        <span>Tạm tính</span>
                                        <span>{pricing.sub_total.toLocaleString()}đ</span>
                                    </div>
                                    <div className="bill-row">
                                        <span>Phí giao hàng</span>
                                        <span>{pricing.delivery_fee > 0 ? `+${pricing.delivery_fee.toLocaleString()}đ` : '0đ'}</span>
                                    </div>
                                    {pricing.discount_amount > 0 && (
                                        <div className="bill-row discount">
                                            <span>Khuyến mãi</span>
                                            <span>-{pricing.discount_amount.toLocaleString()}đ</span>
                                        </div>
                                    )}
                                    <div className="divider"></div>
                                    <div className="bill-row total">
                                        <span>Tổng thanh toán</span>
                                        <span className="total-price">{pricing.total_amount.toLocaleString()}đ</span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button 
                                    onClick={handleSubmitOrder} 
                                    disabled={isSubmitting}
                                    className={`btn-checkout ${isSubmitting ? 'loading' : ''}`}
                                >
                                    {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng ngay'}
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* STYLES CSS-IN-JS */}
            <style jsx global>{`
                body { background-color: #f3f4f6; color: #333; }
            `}</style>
            
            <style jsx>{`
                /* UTILS */
                .container { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
                
                /* NAVBAR */
                .navbar { background: #fff; padding: 15px 0; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
                .navbar .container { display: flex; align-items: center; justify-content: space-between; }
                .navbar h1 { margin: 0; font-size: 1.2rem; font-weight: 700; }
                .back-link { color: #666; text-decoration: none; font-weight: 500; font-size: 0.95rem; }
                .back-link:hover { color: #FF6600; }

                /* LAYOUT */
                .main-content { padding-top: 24px; padding-bottom: 40px; }
                .checkout-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; }
                
                /* CARDS */
                .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #f0f0f0; }
                .section-title { margin-top: 0; margin-bottom: 20px; font-size: 1.1rem; font-weight: 700; color: #222; }

                /* DELIVERY METHODS TABS */
                .method-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .method-tab { 
                    display: flex; align-items: center; gap: 12px; padding: 16px; 
                    border: 2px solid #eee; border-radius: 10px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
                }
                .method-tab .icon { font-size: 1.5rem; background: #f9f9f9; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
                .method-tab.active { border-color: #FF6600; background: #fff5eb; }
                .method-tab.active .icon { background: #fff; color: #FF6600; }
                .tab-title { font-weight: 700; font-size: 0.95rem; }
                .tab-desc { font-size: 0.8rem; color: #777; }
                .check-mark { display: none; position: absolute; top: 8px; right: 8px; font-size: 0.8rem; color: #FF6600; font-weight: bold; }
                .method-tab.active .check-mark { display: block; }

                /* FORMS */
                .form-group { margin-bottom: 16px; }
                .input-with-icon { position: relative; }
                .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #999; display:flex; }
                input[type="text"], input[type="tel"] {
                    width: 100%; padding: 14px 14px 14px 44px; 
                    border: 1px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none; transition: border 0.2s;
                }
                input:focus, textarea:focus { border-color: #FF6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }
                .note-input { width: 100%; padding: 14px; border: 1px solid #e0e0e0; border-radius: 8px; min-height: 80px; resize: vertical; font-family: inherit; font-size: 0.95rem; outline: none; }
                
                /* Address Expansion Animation */
                .address-wrapper { max-height: 0; overflow: hidden; opacity: 0; transition: all 0.3s ease; }
                .address-wrapper.expanded { max-height: 100px; opacity: 1; margin-bottom: 16px; }

                /* PAYMENT OPTIONS */
                .payment-list { display: flex; flexDirection: column; gap: 12px; }
                .payment-option { 
                    display: flex; align-items: center; padding: 14px; border: 1px solid #eee; border-radius: 10px; cursor: pointer; transition: all 0.2s;
                }
                .payment-option:hover { background: #fafafa; }
                .payment-option.selected { border-color: #FF6600; background: #fffbf7; }
                .pay-icon { font-size: 1.4rem; margin-right: 14px; }
                .pay-info { flex: 1; }
                .pay-name { display: block; font-weight: 600; font-size: 0.95rem; }
                .pay-desc { font-size: 0.8rem; color: #777; }
                .radio-circle { width: 18px; height: 18px; border: 2px solid #ddd; border-radius: 50%; position: relative; }
                .payment-option.selected .radio-circle { border-color: #FF6600; }
                .payment-option.selected .radio-circle::after { content:''; position: absolute; width: 10px; height: 10px; background: #FF6600; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); }

                /* RIGHT COLUMN - ORDER */
                .right-col { position: relative; }
                .sticky-wrapper { position: sticky; top: 90px; }
                .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px; }
                .card-header h3 { margin: 0; font-size: 1rem; }
                .edit-link { color: #FF6600; font-size: 0.9rem; font-weight: 600; text-decoration: none; }
                
                /* Order Items */
                .order-items { max-height: 350px; overflow-y: auto; margin-bottom: 20px; padding-right: 5px; }
                .order-items::-webkit-scrollbar { width: 4px; }
                .order-items::-webkit-scrollbar-thumb { background: #eee; border-radius: 4px; }
                .order-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
                .qty-badge { background: #f0f0f0; color: #333; font-weight: 700; font-size: 0.85rem; padding: 4px 8px; border-radius: 6px; margin-right: 12px; }
                .item-details { flex: 1; }
                .item-name { font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
                .item-opts { font-size: 0.8rem; color: #777; margin-top: 4px; }
                .item-user { font-size: 0.75rem; color: #FF6600; font-style: italic; margin-top: 2px; }
                .item-price { font-weight: 600; font-size: 0.95rem; }

                /* Voucher */
                .voucher-section { background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #ddd; }
                .voucher-input-group { display: flex; align-items: center; background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 0 10px; height: 40px; transition: border 0.2s; }
                .voucher-input-group.success { border-color: #27ae60; }
                .voucher-input-group.error { border-color: #e74c3c; }
                .voucher-input-group:focus-within { border-color: #FF6600; }
                .v-icon { color: #888; margin-right: 8px; display: flex; }
                .voucher-input-group input { border: none; outline: none; width: 100%; font-weight: 600; text-transform: uppercase; padding: 0; font-size: 0.9rem; color: #333; }
                .msg-error { color: #e74c3c; font-size: 0.8rem; margin-top: 6px; padding-left: 4px; }
                .msg-success { color: #27ae60; font-size: 0.8rem; margin-top: 6px; padding-left: 4px; }
                .spinner-mini { width: 16px; height: 16px; border: 2px solid #ddd; border-top-color: #FF6600; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Bill */
                .bill-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.95rem; color: #555; }
                .bill-row.discount { color: #27ae60; }
                .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
                .bill-row.total { font-size: 1.2rem; color: #333; font-weight: 700; align-items: flex-end; }
                .total-price { color: #FF6600; font-size: 1.4rem; }

                /* BUTTON */
                .btn-checkout { 
                    width: 100%; padding: 16px; background: linear-gradient(135deg, #FF6600, #FF8800); 
                    color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 700; 
                    cursor: pointer; transition: all 0.2s; margin-top: 10px; box-shadow: 0 4px 15px rgba(255, 102, 0, 0.3); 
                }
                .btn-checkout:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 102, 0, 0.4); }
                .btn-checkout:active { transform: translateY(0); }
                .btn-checkout:disabled { opacity: 0.7; cursor: not-allowed; filter: grayscale(0.5); }

                /* RESPONSIVE */
                @media (max-width: 768px) {
                    .checkout-grid { grid-template-columns: 1fr; gap: 15px; }
                    .main-content { padding-bottom: 100px; } /* Space for sticky button maybe */
                    .card { padding: 16px; border-radius: 0; box-shadow: none; border-left: none; border-right: none; margin-bottom: 10px; }
                    .container { padding: 0; } /* Full width on mobile */
                    .navbar { padding: 12px 16px; }
                    
                    /* Make inputs bigger on touch */
                    input[type="text"], input[type="tel"], .note-input { font-size: 16px; } 
                }
            `}</style>
        </div>
    );
}