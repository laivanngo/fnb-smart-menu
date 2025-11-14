// Tệp: pages/login.js (ĐÃ SỬA LỖI HARD-CODE)
// Mục đích: Trang đăng nhập cho Admin Dashboard.

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
// Đảm bảo biến này được sử dụng
const apiUrl = process.env.NEXT_PUBLIC_API_URL; 

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Kiểm tra xem apiUrl có tồn tại không
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập. Vui lòng kiểm tra file .env.local hoặc cấu hình build.");
            setIsLoading(false);
            return;
        }

        let response; // Khai báo response ở đây để dùng trong cả try/catch
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            // === SỬA LỖI TẠI ĐÂY ===
            // Đã thay thế 'http://127.0.0.1:8000/admin/token' bằng `${apiUrl}/admin/token`
            response = await fetch(`${apiUrl}/admin/token`, { // Địa chỉ Backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            // === KIỂM TRA PHẢN HỒI NGAY LẬP TỨC ===
            if (!response.ok) {
                let errorDetail = 'Đăng nhập thất bại';
                try {
                    // Cố gắng đọc lỗi cụ thể từ Backend (nếu có)
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch (jsonError) {
                    // Nếu Backend không trả về lỗi JSON, dùng status text
                    errorDetail = `Lỗi ${response.status}: ${response.statusText}`;
                }
                // Ném lỗi để nhảy vào khối catch bên dưới
                throw new Error(errorDetail);
            }

            // === XỬ LÝ KHI THÀNH CÔNG ===
            // Chỉ parse JSON nếu response.ok
            const data = await response.json();

            // Lưu "Thẻ từ" (token) vào localStorage
            localStorage.setItem('admin_token', data.access_token);

            // Chuyển hướng đến trang dashboard chính (SAU KHI LƯU TOKEN)
            router.push('/dashboard');
            // Không cần setIsLoading(false) vì đã chuyển trang

        } catch (err) {
            // === XỬ LÝ LỖI CHI TIẾT HƠN ===
            console.error("Chi tiết lỗi Đăng nhập:", err); // In lỗi đầy đủ ra Console

            // Phân biệt lỗi mạng và lỗi ứng dụng
            if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                 setError(`Không thể kết nối đến máy chủ Backend tại: ${apiUrl}. Vui lòng kiểm tra lại.`);
            } else {
                 // Hiển thị lỗi từ Backend hoặc lỗi chung
                 setError(err.message || 'Đã xảy ra lỗi không xác định.');
            }
            setIsLoading(false); // Kết thúc loading KHI CÓ LỖI
        }
        // Bỏ setIsLoading(false) ở đây, chỉ set khi có lỗi
    };

    // (Phần return và styles giữ nguyên như cũ)
    return (
        <>
        <Head>
            <title>Đăng nhập Quản trị - FNB Smart Menu</title>
        </Head>
        <div style={styles.container}>
            <h1 style={styles.title}>🔑 Đăng nhập Quản trị</h1>
            <form onSubmit={handleSubmit} style={styles.form}>
                {/* ... input username ... */}
                 <div style={styles.inputGroup}>
                        <label htmlFor="username" style={styles.label}>Tên đăng nhập:</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                {/* ... input password ... */}
                 <div style={styles.inputGroup}>
                        <label htmlFor="password" style={styles.label}>Mật khẩu:</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                {error && <p style={styles.error}>{error}</p>}
                <button type="submit" style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button} disabled={isLoading}>
                    {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
            </form>
        </div>
        </>
    );
}

// --- CSS nội bộ (Inline Styles) ---
const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f2f5' },
    title: { marginBottom: '30px', color: '#333' },
    form: { background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
    error: { color: 'red', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' },
    button: { width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' },
    buttonDisabled: { background: '#ccc', cursor: 'not-allowed' }
};