// Tệp: context/CartContext.js (HOÀN THIỆN - Đã thêm ClearCart)

import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

// 2. --- "BỘ NÃO" CỦA GIỎ HÀNG (REDUCER) ---
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const newItem = action.payload;
      const cartId = `${newItem.product_id}-${newItem.options.sort().join('-')}-${newItem.note}`;
      
      const existingItemIndex = state.items.findIndex(item => item.cartId === cartId);
      let newItems;
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) => {
          if (index === existingItemIndex) {
            return { ...item, quantity: item.quantity + newItem.quantity };
          }
          return item;
        });
      } else {
        newItems = [...state.items, { ...newItem, cartId: cartId }];
      }
      return updateCartState(newItems);
    }
    
    case 'REMOVE_FROM_CART': {
      const cartIdToRemove = action.payload;
      const newItems = state.items.filter(item => item.cartId !== cartIdToRemove);
      return updateCartState(newItems);
    }

    case 'UPDATE_QUANTITY': {
      const { cartId, quantity } = action.payload;
      const newItems = state.items.map(item => {
        if (item.cartId === cartId) {
          return { ...item, quantity: quantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updateCartState(newItems);
    }

    // === 1. THÊM LOGIC "XÓA SẠCH" ===
    case 'CLEAR_CART': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart'); // Xóa trong localStorage
      }
      return { items: [], itemCount: 0, totalPrice: 0 }; // Trả về giỏ rỗng
    }
    
    default:
      return state;
  }
};

// Hàm "trợ lý" để tính tổng
const updateCartState = (items) => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item._display.itemPrice * item.quantity), 0);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify({ items, itemCount, totalPrice }));
  }
  
  return { items, itemCount, totalPrice };
};

// 3. --- "CHIẾC TÚI" (PROVIDER) ---
export function CartProvider({ children }) {
  
  const [state, dispatch] = useReducer(cartReducer, { items: [], itemCount: 0, totalPrice: 0 }, (initial) => {
      if (typeof window === 'undefined') { return initial; }
      try {
          const localData = localStorage.getItem('cart');
          return localData ? JSON.parse(localData) : initial;
      } catch (error) { return initial; }
  });

  // 3b. Các "Nút bấm" của túi
  const addToCart = (itemPayload) => {
    dispatch({ type: 'ADD_TO_CART', payload: itemPayload });
  };
  
  const removeFromCart = (cartId) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: cartId });
  };
  
  const updateQuantity = (cartId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { cartId, quantity } });
  };

  // === 2. THÊM HÀM "XÓA SẠCH" ===
  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const value = {
    cartItems: state.items,
    itemCount: state.itemCount,
    totalPrice: state.totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart, // <-- 3. ĐƯA HÀM RA ĐỂ DÙNG
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// 4. --- "CÁI MÓC" (HOOK) ---
export function useCart() {
  return useContext(CartContext);
}