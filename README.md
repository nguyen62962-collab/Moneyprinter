# TínhTiền — bộ công cụ tài chính cá nhân

Trang web tĩnh tiếng Việt gồm ba công cụ: **tính lãi vay trả góp**, **lãi tiết kiệm**, **lãi kép**.
Không cần máy chủ, không cần bước build — toàn bộ trang nằm trong thư mục `site/`.

Nguồn thu của trang là quảng cáo (Google AdSense) và liên kết tiếp thị. Cả hai đều **tắt mặc định**
và chỉ bật khi bạn điền thông tin của mình vào `site/assets/config.js`.

## Việc cần bạn tự làm (không thể tự động hoá thay bạn)

1. **Đưa trang lên mạng** — chọn một trong hai:
   - *Cloudflare Pages / Netlify / Vercel* (miễn phí, dùng được với repo riêng tư): kết nối repo này,
     để trống lệnh build, thư mục xuất bản là `site`.
   - *GitHub Pages* (repo phải công khai, hoặc tài khoản trả phí): vào **Settings → Pages → Source: GitHub Actions**,
     rồi **Settings → Secrets and variables → Actions → Variables** tạo biến `DEPLOY_PAGES` = `true`.
     Từ đó mỗi lần push lên nhánh mặc định, trang tự kiểm thử và triển khai.
2. **Đăng ký Google AdSense** bằng địa chỉ trang, chờ duyệt, rồi điền mã `ca-pub-…` vào `adsenseClient`.
3. **Thêm liên kết tiếp thị** (nếu có) vào `affiliateLinks` — chúng hiện dưới mỗi công cụ kèm nhãn công khai.

Thu nhập phụ thuộc vào lượng người truy cập; trang mới chưa có khách thì chưa có doanh thu.

## Phát triển

```bash
npm test                               # kiểm thử các công thức (cần Node 22+)
python3 -m http.server --directory site   # xem thử tại http://localhost:8000
```

- `site/assets/calc.js` — công thức tính, tách khỏi giao diện, có test trong `tests/`.
- `site/assets/app.js` — gắn biểu mẫu, quảng cáo và liên kết tiếp thị.
- `site/assets/config.js` — nơi duy nhất cần sửa để bật kiếm tiền.
