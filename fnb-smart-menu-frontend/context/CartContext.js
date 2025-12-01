// Tệp: fnb-smart-menu-frontend/context/CartContext.js
// (BẢN CHUẨN - LOGIC GIỎ HÀNG & ĐƠN NHÓM)

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    // State Giỏ hàng
    const [cartItems, setCartItems] = useState([]);
    
    // State Đơn nhóm
    const [groupMode, setGroupMode] = useState(false);
    const [currentUser, setCurrentUser] = useState('Tôi');

    // 1. Load giỏ hàng từ LocalStorage khi khởi động
    useEffect(() => {
        const savedCart = localStorage.getItem('shopping_cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Lỗi đọc giỏ hàng cũ", e);
            }
        }
    }, []);

    // 2. Lưu giỏ hàng mỗi khi thay đổi
    useEffect(() => {
        localStorage.setItem('shopping_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // 3. Hàm thêm vào giỏ (Thông minh: Tự cộng dồn nếu trùng món + option + người đặt)
    const addToCart = (newItem) => {
        setCartItems(prev => {
            // Tạo ID duy nhất cho món dựa trên: ID món + Options + Note + Người đặt
            // Sắp xếp options để [1,2] giống [2,1]
            const sortedOptions = newItem.options ? [...newItem.options].sort().join('-') : '';
            const uniqueKey = `${newItem.product_id}_${sortedOptions}_${newItem.note || ''}_${groupMode ? currentUser : ''}`;

            const existingItemIndex = prev.findIndex(item => {
                const itemKey = `${item.product_id}_${item.options ? [...item.options].sort().join('-') : ''}_${item.note || ''}_${item.orderedBy || ''}`;
                return itemKey === uniqueKey;
            });

            if (existingItemIndex > -1) {
                // Món đã có -> Cộng thêm số lượng
                const newCart = [...prev];
                newCart[existingItemIndex].quantity += newItem.quantity;
                return newCart;
            } else {
                // Món mới -> Thêm vào list (Gán thêm cartId để quản lý)
                return [...prev, { 
                    ...newItem, 
                    cartId: Date.now() + Math.random(),
                    orderedBy: groupMode ? currentUser : '' // Lưu tên người đặt nếu là đơn nhóm
                }];
            }
        });
    };

    // 4. Xóa món
    const removeFromCart = (cartId) => {
        setCartItems(prev => prev.filter(item => item.cartId !== cartId));
    };

    // 5. Cập nhật số lượng
    const updateQuantity = (cartId, newQty) => {
        if (newQty < 1) {
            if (confirm("Bạn muốn xóa món này?")) removeFromCart(cartId);
            return;
        }
        setCartItems(prev => prev.map(item => item.cartId === cartId ? { ...item, quantity: newQty } : item));
    };

    // 6. Xóa sạch giỏ
    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('shopping_cart');
    };

    // 7. Tính tổng tiền & Tổng số lượng
    const { itemCount, totalPrice } = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            acc.itemCount += item.quantity;
            // Giá item đã được tính sẵn trong _display.itemPrice lúc thêm vào
            acc.totalPrice += (item._display?.itemPrice || 0) * item.quantity;
            return acc;
        }, { itemCount: 0, totalPrice: 0 });
    }, [cartItems]);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            itemCount,
            totalPrice,
            // Group Order Props
            groupMode,
            setGroupMode,
            currentUser,
            setCurrentUser
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}