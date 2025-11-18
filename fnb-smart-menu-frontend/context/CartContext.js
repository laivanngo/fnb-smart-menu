// Tệp: context/CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 1. Load giỏ hàng từ LocalStorage khi mở web
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Lỗi đọc giỏ hàng:", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // 2. Lưu giỏ hàng mỗi khi có thay đổi
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('cart', JSON.stringify(cartItems));
        }
    }, [cartItems, isLoaded]);

    // 3. Hàm thêm vào giỏ
    const addToCart = (productData, details) => {
        setCartItems(prevItems => {
            // Kiểm tra xem món này (cùng options) đã có trong giỏ chưa
            const existingItemIndex = prevItems.findIndex(item => 
                item.product_id === productData.product_id && 
                JSON.stringify(item.options) === JSON.stringify(productData.options)
            );

            if (existingItemIndex > -1) {
                // Nếu có rồi thì tăng số lượng
                const newItems = [...prevItems];
                newItems[existingItemIndex].quantity += productData.quantity;
                return newItems;
            } else {
                // Nếu chưa thì thêm mới
                return [...prevItems, { ...productData, ...details }];
            }
        });
    };

    // 4. Hàm xóa khỏi giỏ
    const removeFromCart = (index) => {
        setCartItems(prevItems => {
            const newItems = [...prevItems];
            newItems.splice(index, 1);
            return newItems;
        });
    };

    // 5. Tính tổng số lượng và tổng tiền
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = cartItems.reduce((total, item) => {
        // Giá cơ bản * số lượng
        let price = item.itemPrice * item.quantity;
        // Cộng thêm giá options (nếu có logic tính giá option)
        return total + price;
    }, 0);

    return (
        <CartContext.Provider value={{ 
            cartItems, 
            addToCart, 
            removeFromCart, 
            itemCount, 
            totalPrice 
        }}>
            {children}
        </CartContext.Provider>
    );
}