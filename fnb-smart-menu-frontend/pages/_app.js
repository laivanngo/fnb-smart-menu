// Tệp: pages/_app.js
// Mục đích: "Đeo" chiếc túi (CartProvider) ra ngoài toàn bộ ứng dụng

import '../styles/menu.css'
import "@/styles/globals.css";
// 1. Import "Chiếc túi"
import { CartProvider } from "../context/CartContext.js.backup";

export default function App({ Component, pageProps }) {
  return (
    // 2. "Bọc" <CartProvider> ra ngoài <Component>
    // Giờ đây, mọi <Component> (mọi trang) đều có thể truy cập vào giỏ hàng
    <CartProvider>
      <Component {...pageProps} />
    </CartProvider>
  );
}