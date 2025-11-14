// Tệp: components/CartDisplay.js (Bản HOÀN CHỈNH)
// Mục đích: Hiển thị giỏ hàng (lơ lửng)
// Đã bao gồm:
// 1. Sửa lỗi Hydration (với hasMounted)
// 2. Nút "Thanh toán" (với useRouter)

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext'; // Lấy "cái móc"
import { useRouter } from 'next/router'; // 1. IMPORT "Bộ điều hướng"

export default function CartDisplay() {
  const [isOpen, setIsOpen] = useState(false); // Trạng thái Đóng/Mở
  const { cartItems, itemCount, totalPrice, removeFromCart, updateQuantity } = useCart(); // Lấy mọi thứ từ "Chiếc túi"
  const router = useRouter(); // 2. KHỞI TẠO "Bộ điều hướng"

  // === PHẦN SỬA LỖI HYDRATION ===
  // 3. Tạo một "bộ nhớ" (state) để kiểm tra
  const [hasMounted, setHasMounted] = useState(false);

  // 4. Hàm này sẽ CHỈ CHẠY 1 LẦN ở "Client" (trình duyệt)
  //    SAU KHI quá trình "khớp" (hydration) ban đầu hoàn tất
  useEffect(() => {
    setHasMounted(true); // Đánh dấu: "Tôi đã ở trình duyệt"
  }, []); // Mảng rỗng = chạy 1 lần duy nhất

  // 5. "CỔNG AN NINH"
  // Nếu "chưa ở trình duyệt" (hasMounted là false),
  // cả server và client (lần render đầu) sẽ đều không hiển thị gì cả.
  // -> Chúng khớp nhau (đều là 'null') -> Hết lỗi!
  if (!hasMounted) {
    return null;
  }
  // === KẾT THÚC SỬA LỖI ===


  // 6. HÀM XỬ LÝ NÚT "THANH TOÁN"
  const handleCheckout = () => {
    setIsOpen(false); // Đóng giỏ hàng
    router.push('/checkout'); // Chuyển đến trang checkout
  };

  // Nếu giỏ hàng đang mở, hiển thị chi tiết
  if (isOpen) {
    return (
      <div className="cart-modal-backdrop" onClick={() => setIsOpen(false)}>
        <div className="cart-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="cart-header">
            <h3>Giỏ hàng ({itemCount})</h3>
            <button onClick={() => setIsOpen(false)} className="cart-close">×</button>
          </div>
          
          <div className="cart-items-list">
            {cartItems.length === 0 ? (
              <p style={{textAlign: 'center', padding: '20px'}}>Giỏ hàng trống</p>
            ) : (
              cartItems.map(item => (
                <div key={item.cartId} className="cart-item">
                  <div className="cart-item-info">
                    <strong>{item._display.name}</strong>
                    <small>{item._display.optionsText}</small>
                    {item.note && <small><em>Ghi chú: {item.note}</em></small>}
                  </div>
                  <div className="cart-item-controls">
                    <div className="quantity-selector-cart">
                      <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>+</button>
                    </div>
                    <span>
                      {(item._display.itemPrice * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                    <button onClick={() => removeFromCart(item.cartId)} className="cart-remove">Xóa</button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="cart-footer">
            <strong>Tổng cộng: {totalPrice.toLocaleString('vi-VN')}đ</strong>
            {/* Nút thanh toán gọi hàm handleCheckout */}
            <button className="checkout-btn" onClick={handleCheckout}>
              Thanh toán
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu giỏ hàng đang đóng, chỉ hiển thị "nút nổi"
  // (Đoạn code này cũng chỉ chạy khi hasMounted = true)
  if (itemCount === 0) return null; // Ẩn luôn nếu giỏ trống
  
  return (
    <div className="cart-fab" onClick={() => setIsOpen(true)}>
      🛒
      <span className="cart-fab-count">{itemCount}</span>
      <span className="cart-fab-total">{totalPrice.toLocaleString('vi-VN')}đ</span>
    </div>
  );
}