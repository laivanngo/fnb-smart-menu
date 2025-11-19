// Tệp: pages/checkout.js (Theme màu Cam)
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, totalPrice, itemCount, clearCart } = useCart();
    
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', note: '' });
    const [deliveryMethod, setDeliveryMethod] = useState('TIEU_CHUAN');
    const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');
    const [voucherCode, setVoucherCode] = useState('');
    
    const [calculation, setCalculation] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => { 
        setHasMounted(true);
        const savedCustomer = localStorage.getItem('customerInfo');
        if (savedCustomer) {
            try {
                const parsed = JSON.parse(savedCustomer);
                setCustomerInfo(prev => ({
                    ...prev,
                    name: parsed.name || '',
                    phone: parsed.phone || '',
                    address: parsed.address || ''
                }));
            } catch (e) {
                console.error("Lỗi đọc thông tin khách hàng cũ", e);
            }
        }
    }, []);

    const handleInfoChange = (e) => {
        setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
    };

    const fetchCalculation = async (currentVoucherCode) => {
        if (!hasMounted || cartItems.length === 0) {
             setCalculation({ sub_total: 0, delivery_fee: 0, discount_amount: 0, total_amount: 0 });
            return;
        }
        if (!apiUrl) { setError("Lỗi cấu hình hệ thống (API URL)."); return; }

        setIsCalculating(true); setError('');

        const itemsPayload = cartItems.map(item => ({
            product_id: item.product_id, quantity: item.quantity, options: item.options,
        }));

        try {
            const res = await fetch(`${apiUrl}/orders/calculate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsPayload,
                    voucher_code: currentVoucherCode || null,
                    delivery_method: deliveryMethod,
                }),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Không thể tính toán đơn hàng');
            }
            const data = await res.json();
            setCalculation(data);
        } catch (err) {
            setError(err.message);
            setCalculation(null);
        } finally {
            setIsCalculating(false);
        }
    };
    
    useEffect(() => {
        if (hasMounted) {
            if (router.isReady && itemCount === 0 && router.pathname === '/checkout') {
                router.replace('/');
            } else if (itemCount > 0) {
                fetchCalculation(voucherCode);
            } else if (itemCount === 0) {
                setCalculation({ sub_total: 0, delivery_fee: 0, discount_amount: 0, total_amount: 0 });
            }
        }
    }, [hasMounted, deliveryMethod, cartItems, itemCount, router.isReady, router.pathname, voucherCode]);

    const handleApplyVoucher = () => {
        fetchCalculation(voucherCode);
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (!apiUrl) { setError("Lỗi cấu hình hệ thống (API URL)."); return; }
        
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) { setError('Vui lòng nhập đủ Họ tên, SĐT và Địa chỉ'); return; }
        if (itemCount === 0) { setError('Giỏ hàng trống!'); return; }
        if (!calculation && !isCalculating) { setError('Đang chờ tính toán, vui lòng thử lại.'); fetchCalculation(voucherCode); return; }
        if (!calculation && isCalculating) { setError('Đang tính toán, vui lòng chờ...'); return; }

        setIsLoading(true); setError('');

        localStorage.setItem('customerInfo', JSON.stringify({
            name: customerInfo.name,
            phone: customerInfo.phone,
            address: customerInfo.address
        }));

        const orderPayload = {
            items: cartItems.map(item => ({ product_id: item.product_id, quantity: item.quantity, options: item.options, note: item.note })),
            voucher_code: calculation?.discount_amount > 0 ? voucherCode : null,
            delivery_method: deliveryMethod,
            customer_name: customerInfo.name, customer_phone: customerInfo.phone, customer_address: customerInfo.address, customer_note: customerInfo.note,
            payment_method: paymentMethod,
        };

        try {
            const res = await fetch(`${apiUrl}/orders`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload),
            });
            if (!res.ok) { const errData = await res.json(); throw new Error(errData.detail || 'Đặt hàng thất bại'); }

            const orderResult = await res.json();
            alert(`Đặt hàng thành công! Mã đơn hàng của bạn là #${orderResult.id}`);
            clearCart();
            router.push('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!hasMounted) {
        return (
            <div className="container" style={{textAlign: 'center', paddingTop: '50px'}}>
                <Head><title>Thanh toán</title></Head>
                <p>Đang tải giỏ hàng...</p>
            </div>
        );
    }

    return (
        <div className="container checkout-page">
            <Head><title>SUKA - Thanh toán</title></Head>
            <header className="header">🛒 Thanh toán</header>
            <form onSubmit={handlePlaceOrder}>
                <div className="checkout-form">
                     <h3>Thông tin Giao hàng</h3>
                    <input name="name" placeholder="Họ và Tên" value={customerInfo.name} onChange={handleInfoChange} required />
                    <input name="phone" placeholder="Số điện thoại" value={customerInfo.phone} onChange={handleInfoChange} required />
                    <input name="address" placeholder="Địa chỉ" value={customerInfo.address} onChange={handleInfoChange} required />
                    <textarea name="note" placeholder="Ghi chú thêm (nếu có)" value={customerInfo.note} onChange={handleInfoChange} />
                    <h3>Phương thức Giao hàng</h3>
                    <div className="option-group-checkout">
                        <label> <input type="radio" name="delivery" value="TIEU_CHUAN" checked={deliveryMethod === 'TIEU_CHUAN'} onChange={(e) => setDeliveryMethod(e.target.value)} /> Giao Tiêu chuẩn (20-30 phút) </label>
                        <label> <input type="radio" name="delivery" value="NHANH" checked={deliveryMethod === 'NHANH'} onChange={(e) => setDeliveryMethod(e.target.value)} /> Giao Nhanh (10-15 phút) </label>
                    </div>
                    <h3>Phương thức Thanh toán</h3>
                    <div className="option-group-checkout">
                        <label> <input type="radio" name="payment" value="TIEN_MAT" checked={paymentMethod === 'TIEN_MAT'} onChange={(e) => setPaymentMethod(e.target.value)} /> 💵 Tiền mặt </label>
                        <label> <input type="radio" name="payment" value="MOMO" checked={paymentMethod === 'MOMO'} onChange={(e) => setPaymentMethod(e.target.value)} /> 📱 MoMo </label>
                    </div>
                </div>
                <div className="checkout-summary">
                    <h3>Đơn hàng của bạn ({itemCount})</h3>
                    <div className="cart-items-list-checkout">
                        {cartItems.map(item => (
                            <div key={item.cartId} className="cart-item-checkout">
                                <span className="item-qty">{item.quantity}x</span>
                                <div className="item-details">
                                    <strong>{item._display.name}</strong>
                                    <small>{item._display.optionsText}</small>
                                </div>
                                <span className="item-price"> {(item._display.itemPrice * item.quantity).toLocaleString('vi-VN')}đ </span>
                            </div>
                        ))}
                    </div>
                    <div className="voucher-input-group">
                        <input type="text" placeholder="Nhập mã giảm giá (nếu có)" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} style={styles.voucherInput} />
                        <button type="button" onClick={handleApplyVoucher} style={styles.applyButton} disabled={isCalculating}> Áp dụng </button>
                    </div>
                    <div className="checkout-total">
                        {isCalculating ? ( <p style={{textAlign: 'center', color: '#555'}}>Đang tính toán...</p> )
                         : calculation ? (
                            <>
                                <div className="total-row"><span>Tạm tính:</span><span>{calculation.sub_total.toLocaleString('vi-VN')}đ</span></div>
                                <div className="total-row"><span>Phí giao hàng:</span><span>{calculation.delivery_fee > 0 ? calculation.delivery_fee.toLocaleString('vi-VN')+'đ' : 'Miễn phí'}</span></div>
                                {calculation.discount_amount > 0 && ( <div className="total-row discount"><span>Giảm giá ({voucherCode}):</span><span>-{calculation.discount_amount.toLocaleString('vi-VN')}đ</span></div> )}
                                <div className="total-row final"><span>Tổng cộng:</span><span>{calculation.total_amount.toLocaleString('vi-VN')}đ</span></div>
                            </>
                         ) : ( error ? null : <p style={{textAlign: 'center', color: '#888'}}>Vui lòng chọn P.thức giao hàng</p> )}
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="place-order-btn" disabled={isLoading || isCalculating || !calculation || itemCount === 0}>
                        {isLoading ? 'Đang xử lý...' : '📦 ĐẶT HÀNG'}
                    </button>
                </div>
            </form>
            <style jsx>{`
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; min-height: 100vh; }
                .header { font-size: 1.8rem; font-weight: 800; margin-bottom: 25px; color: #FF6600; border-bottom: 2px solid #FF6600; padding-bottom: 10px; display: inline-block; }
                form { display: flex; gap: 30px; flex-wrap: wrap; }
                .checkout-form { flex: 1.5; min-width: 300px; }
                .checkout-summary { flex: 1; min-width: 300px; background: white; padding: 25px; border-radius: 16px; height: fit-content; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eee; }
                
                h3 { font-size: 1.2rem; margin: 20px 0 15px; color: #333; font-weight: 700; }
                input, textarea { width: 100%; padding: 14px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; fontSize: 1rem; transition: border 0.2s; }
                input:focus, textarea:focus { border-color: #FF6600; outline: none; }
                textarea { height: 100px; resize: vertical; }
                
                .option-group-checkout { display: flex; flex-direction: column; gap: 10px; }
                .option-group-checkout label { display: flex; align-items: center; gap: 12px; padding: 15px; border: 1px solid #eee; border-radius: 10px; cursor: pointer; background: white; transition: all 0.2s; font-weight: 500; }
                .option-group-checkout label:hover { border-color: #FF6600; background-color: #fff5ec; }
                input[type="radio"] { width: auto; margin: 0; accent-color: #FF6600; transform: scale(1.2); }

                .cart-items-list-checkout { max-height: 350px; overflow-y: auto; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
                .cart-item-checkout { display: flex; gap: 12px; margin-bottom: 15px; font-size: 0.95rem; align-items: flex-start; }
                .item-qty { font-weight: 800; color: #FF6600; min-width: 25px; background: #fff5ec; padding: 2px 6px; border-radius: 6px; text-align: center; }
                .item-details { flex: 1; }
                .item-details strong { display: block; margin-bottom: 4px; color: #333; }
                .item-details small { display: block; color: #777; font-size: 0.85rem; margin-top: 2px; }
                .item-price { font-weight: 700; color: #333; }

                .voucher-input-group { display: flex; margin-bottom: 25px; }

                .checkout-total { margin-bottom: 25px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 1rem; }
                .total-row.final { font-weight: 800; font-size: 1.4rem; color: #FF6600; border-top: 2px dashed #eee; padding-top: 15px; margin-top: 15px; }
                .total-row.discount { color: #28a745; }

                .place-order-btn { width: 100%; padding: 16px; background: #FF6600; color: white; border: none; border-radius: 12px; font-size: 1.2rem; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(255, 102, 0, 0.3); }
                .place-order-btn:hover { background: #e65c00; transform: translateY(-2px); }
                .place-order-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
                .error-message { color: #dc3545; margin-bottom: 15px; text-align: center; background: #fff0f0; padding: 10px; border-radius: 8px; }

                @media (max-width: 768px) {
                    form { flex-direction: column; }
                    .checkout-summary { order: -1; }
                }
            `}</style>
        </div>
    );
}

const styles = {
    voucherInput: { flexGrow: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px 0 0 8px', fontSize: '0.95rem', outline: 'none' },
    applyButton: { padding: '12px 20px', border: '1px solid #FF6600', borderLeft: 'none', background: '#FF6600', color: 'white', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }
};