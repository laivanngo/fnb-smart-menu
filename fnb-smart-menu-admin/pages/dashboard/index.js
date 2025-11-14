// Tệp: pages/dashboard/index.js
// Mục đích: Trang Dashboard chính, được bảo vệ

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

// Hàm trợ giúp để lấy token
const getToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('admin_token');
    }
    return null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false); // Trạng thái xác thực

    // --- Logic Bảo vệ Route ---
    useEffect(() => {
        const token = getToken();
        if (!token) {
            // Nếu không có token, đá về trang login
            router.replace('/login'); // Dùng replace để không lưu vào lịch sử
        } else {
            // Nếu có token, đánh dấu là admin (có thể kiểm tra token hợp lệ ở đây sau)
            setIsAdmin(true);
            // Chúng ta sẽ thêm logic gọi API /admin/me để kiểm tra token hợp lệ ở bước sau
        }
    }, [router]); // Chạy khi router sẵn sàng

    // --- Hàm Đăng xuất ---
    const handleLogout = () => {
        localStorage.removeItem('admin_token'); // Xóa token
        router.push('/login'); // Về trang login
    };

    // --- Giao diện ---
    // Chỉ hiển thị nội dung nếu đã xác thực là admin
    if (!isAdmin) {
        // Hiển thị tạm loading hoặc null trong khi kiểm tra
        return (
             <div style={{ padding: '50px', textAlign: 'center' }}>
                 <Head><title>Dashboard</title></Head>
                 <p>Đang kiểm tra xác thực...</p>
             </div>
        );
    }

    // Nếu đã xác thực, hiển thị Dashboard
    return (
        <div style={{ padding: '30px' }}>
            <Head><title>Dashboard - FNB Smart Menu</title></Head>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>📊 Dashboard Quản trị</h1>
                <button onClick={handleLogout} style={styles.logoutButton}>Đăng xuất</button>
            </header>

            <p>Chào mừng bạn đến với trang quản trị!</p>
            <p>Từ đây, bạn có thể quản lý Menu, Đơn hàng, Voucher...</p>

            {/* Các liên kết đến các trang quản lý khác sẽ được thêm vào đây sau */}
            {/* === THÊM LIÊN KẾT VÀO ĐÂY === */}
            <nav style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link href="/dashboard/categories" style={styles.navLink}>📚 Quản lý Danh mục</Link>
                <Link href="/dashboard/products" style={styles.navLink}>🍔 Quản lý Sản phẩm</Link>
                <Link href="/dashboard/options" style={styles.navLink}>⚙️ Quản lý Tùy chọn</Link>
                <Link href="/dashboard/vouchers" style={styles.navLink}>🎟️ Quản lý Voucher</Link>                
                <Link href="/dashboard/orders" style={styles.navLink}>🛒 Quản lý Đơn hàng</Link>
            </nav>

        </div>
    );
}

// --- CSS nội bộ ---
const styles = {
    logoutButton: {
        padding: '8px 15px',
        background: '#ff4d4f',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: '600',
    },

// === THÊM STYLE CHO LIÊN KẾT ===
    navLink: {
        display: 'inline-block',
        padding: '10px 15px',
        background: '#eee',
        borderRadius: '4px',
        textDecoration: 'none',
        color: '#333',
        fontWeight: '500',
        transition: 'background 0.2s'
    }

    
};

// Thêm hover effect
styles.navLink[':hover'] = { background: '#ddd' };