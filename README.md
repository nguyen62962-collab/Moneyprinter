# TínhTiền — bộ công cụ tài chính cá nhân

Trang web tĩnh tiếng Việt gồm năm công cụ: **vay trả góp** (kèm trả nợ trước hạn), **khả năng vay theo thu nhập**,
**lãi tiết kiệm** (kèm tái tục), **lãi kép** và **kế hoạch tiết kiệm theo mục tiêu**.
Không cần máy chủ — toàn bộ trang nằm trong thư mục `site/`.

Điểm riêng cho từng người dùng (tất cả chạy trên trình duyệt, không gửi dữ liệu đi đâu):

- Trang chủ dẫn theo nhu cầu ("Tôi muốn mua nhà", "Tôi muốn trả nợ sớm hơn"…), mỗi công cụ có ví dụ bấm nhanh.
- Kết quả tự cập nhật khi gõ, có nhận xét bằng lời và biểu đồ gốc – lãi theo từng năm.
- Lưu nhiều kịch bản để so sánh, tự nhớ số liệu lần trước, mỗi phép tính có liên kết chia sẻ riêng.
- Tải bảng CSV, in kết quả; tuỳ chỉnh sáng/tối, màu chủ đạo và cỡ chữ.

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
npm test                                  # kiểm thử các công thức (cần Node 22+)
npm run build                             # sinh lại các trang HTML sau khi sửa scripts/build-pages.js
python3 -m http.server --directory site   # xem thử tại http://localhost:8000
```

- `site/assets/calc.js` — công thức tính, tách khỏi giao diện, có test trong `tests/`.
- `site/assets/app.js` — biểu mẫu, biểu đồ, kịch bản đã lưu, quảng cáo và liên kết tiếp thị.
- `site/assets/prefs.js`, `style.css` — tuỳ chỉnh giao diện của người dùng.
- `site/assets/config.js` — nơi duy nhất cần sửa để bật kiếm tiền.
- `scripts/articles.js` — nội dung các bài hướng dẫn; số liệu ví dụ được tính bằng `calc.js` lúc dựng trang, không gõ tay.
- `scripts/tables.js` — các trang "bảng tra nhanh" (vay X trả góp bao nhiêu, gửi X lãi bao nhiêu), cũng tính bằng `calc.js`.
- `scripts/build-pages.js` — khung chung và nội dung của mọi trang; **đừng sửa trực tiếp các file `index.html`**,
  hãy sửa file này. Lúc triển khai, các trang luôn được dựng lại từ file này và `config.js`.

## Tìm kiếm (SEO)

- Mỗi trang có thẻ canonical, thẻ chia sẻ mạng xã hội (ảnh `site/assets/og.png`) và dữ liệu có cấu trúc;
  `sitemap.xml` và `robots.txt` được sinh tự động khi dựng trang.
- Địa chỉ trang lấy từ `SITE_URL` trong `scripts/build-pages.js`. **Khi chuyển sang tên miền riêng, sửa giá trị này.**
- Xác minh Google Search Console: dán mã vào `googleSiteVerification` trong `site/assets/config.js`.
