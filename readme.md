# Hoàng’s Graduation — thư mời trong căn phòng 3D

Thư mời lễ tốt nghiệp của **Lưu Cao Hoàng**, giữ căn phòng, camera, âm thanh,
hiệu ứng CRT, mô hình và texture từ portfolio của Henry Heffernan. Giao diện
Windows cổ điển trong màn hình được host cùng project: cửa sổ kéo/thay đổi
kích thước, thu nhỏ, phóng to, desktop shortcuts, Start menu và thanh tác vụ.

Nội dung tham chiếu `gradar`: **07/11/2026, 09:00–12:00 GMT+7**, Đại học FPT HCM.
Các mục trong desktop: Thư mời, Buổi lễ (bản đồ/lịch), Kỷ niệm, Hồi âm, Credits.

## Chạy trên máy

Node.js 22 trở lên:

```bash
npm ci
cp .env.example .env.local
# Điền publishable key của cùng Supabase project đang dùng cho gradar.
npm run dev
```

Build và xem bản static:

```bash
npm run build
npm start
```

Mở `http://127.0.0.1:4173/` để vào căn phòng. `/invitation.html` mở desktop
trực tiếp, phù hợp khi không muốn tải 3D hoặc dùng điện thoại. Biểu tượng thư
ở cuối hàng thời gian, âm lượng và camera mở trang này sau khi vào phòng;
thiết bị không tạo được WebGL sẽ chuyển sang trang này.

## Link riêng và RSVP

- `/`: căn phòng với thư mời mẫu, không ghi RSVP.
- `/invite/<slug>?key=<guest-token>`: căn phòng dành cho khách có mã hợp lệ.
- `/invitation.html?guest=<slug>&key=<guest-token>`: cùng thư mời, mở trực tiếp.
- `/admin/rsvp?key=<admin-token>`: tạo link khách riêng và xem tổng hợp RSVP.

Giữ nguyên mã khách/admin hiện có của `gradar`, thay origin của URL sang địa
chỉ project này. Mã admin không nằm trong source hoặc các link công khai.
Link tạo từ dashboard sử dụng origin đang mở: khi gửi khách, mở dashboard
trên tên miền đã deploy rồi sao chép link.

Dùng **cùng Supabase database/RPC đã có của gradar**, gồm
`get_invitation`, `get_guest_rsvp`, `submit_guest_rsvp`, `get_rsvp_dashboard`,
`get_invitation_links` và `create_invitation`. Không cần chạy Express hay API
email cũ. Các RPC kiểm tra slug/token ở backend; link không hợp lệ không hiển
thị nội dung cá nhân và không được gửi RSVP. Demo không lưu phản hồi.

Lưu/cập nhật phản hồi qua RPC hiện có sẽ dùng luôn cơ chế email thông báo
của gradar nếu cơ chế đó đang hoạt động. Project này không tạo database,
chạy migration hoặc thay đổi cấu hình email. Nếu dùng Supabase project mới,
cần triển khai backend/migrations của gradar trước.

Hai biến **public** được nhúng lúc build:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`VITE_SUPABASE_ANON_KEY` nhận publishable/anon key của project. Không dùng
Supabase secret/service-role key ở đây. File `.env.local` không được commit.
Đổi cấu hình cần build lại.

## Deploy static lên Vercel

`vercel.json` đã cấu hình:

- Framework Preset: **Other**.
- Build Command: `npm run build`.
- Output Directory: `public`.
- Node.js: **22.x** hoặc **24.x**.
- Điền hai biến public bên trên trong Environment Variables rồi deploy.

Rewrite giữ route khách riêng và route quản trị khi mở trực tiếp hoặc refresh.
RSVP gọi thẳng Supabase, website trên Vercel vẫn là static. Giữ đầy đủ resource
3D gốc nên bản room nặng hơn bản đọc trực tiếp; thư mời có bundle riêng.

## Sửa nội dung

- `src/Invitation/data/event.ts`: tên, ngày giờ, địa điểm, bản đồ.
- `src/Invitation/data/copy.ts`: lời mời và lời cảm ơn.
- `src/Invitation/Content.tsx`: các trang thư mời, thông tin, ảnh và credits.
- `static/invitation/`: ảnh, chữ ký và font từ gradar.
- `static/invitation/photos/fit.png`: ảnh chân dung ở phần Thư mời;
  khung ảnh căn vào mũ, khuôn mặt và thân trên bằng `.portrait` trong `src/Invitation/style.css`.
- `static/invitation/photos/event-cover.png`: ảnh riêng của trang Buổi lễ.
  Thay file này bằng ảnh PNG mới rồi build lại để cập nhật ảnh trang Buổi lễ.
  Ảnh trong mục Kỷ niệm được quản lý riêng ở thư mục gallery bên dưới.
- `static/invitation/gallery/`: ảnh gốc của gallery. Thêm/xóa ảnh
  trong thư mục này rồi build lại; danh sách Kỷ niệm được tạo tự động, hỗ trợ
  cả thư mục con và tên file có khoảng trắng. Dev server cũng theo dõi thay đổi
  trong thư mục này để cập nhật danh sách và ảnh xem trước.
- Build/dev tự tạo ảnh xem trước WebP rộng tối đa 480px và 800px, chất lượng 80,
  trong `invitation/gallery-previews/` của bản xuất. Ảnh có tên theo hash nội dung;
  bản chuyển đổi được cache ở `node_modules/.cache/gallery/` để tái sử dụng.
  Ảnh gốc được giữ nguyên; không cần tự nén hay đổi tên ảnh.
- Mục Kỷ niệm ban đầu hiện 12 ảnh rồi tự thêm 12 ảnh khi cuộn gần cuối
  vùng nội dung. Trình duyệt chọn bản WebP phù hợp màn hình và tải ảnh khi gần
  vùng xem; bấm ảnh để mở ảnh gốc ở tab mới. Caption vẫn ghép theo đường dẫn gốc.
- Caption ảnh đọc trực tiếp từ RPC `get_gallery_captions` của Supabase đang
  dùng chung với gradar, ghép bằng đường dẫn ảnh đã URL-encode. Sửa caption
  trong dashboard ảnh của gradar; không cần build lại. Caption được tải trước
  khi mở thư và cache trong bộ nhớ + localStorage trong 24 giờ. Cache hết hạn
  vẫn hiển thị ngay, cập nhật nền và áp dụng caption mới ở lần mở Kỷ niệm tiếp
  theo để tránh xê dịch bố cục. Muốn cập nhật ngay, xóa mục localStorage có tiền tố
  `invitation:gallery-captions:v1:` rồi tải lại trang. Nếu chưa có cache, gallery
  chờ caption tối đa 5 giây; kết nối lỗi vẫn cho xem ảnh. Preview có hash được
  cấu hình HTTP cache một năm trên Vercel; đổi ảnh sẽ tạo URL mới.
- `src/Desktop/`: giao diện Windows và tài nguyên desktop gốc.
- Lời chào/lời nhắn riêng từng khách: sửa khi tạo khách trong dashboard.

## Xuất Story 9:16

Chạy `npm run export:story` để xuất hai file trong `exports/story/`:

- `hoang-graduation-story.png`: ảnh thư mời 1080 × 1920, căn nội dung cho Story.
- `hoang-graduation-story.mp4`: video H.264 1080 × 1920, 30 fps, dài 10 giây.
  Camera đi từ toàn cảnh phòng đến màn hình. Tiêu đề trắng mờ dần khi bắt đầu
  zoom, video kết thúc ở màn hình máy tính. Giữ âm thanh phòng gốc và các hiệu
  ứng đang phát theo đúng thời điểm, mã hóa AAC stereo 48 kHz.

Cần `ffmpeg` và Chromium (`npx playwright install chromium`, hoặc dùng
`CHROMIUM_PATH`). Công cụ luôn xuất thư mời công khai, không chứa mã truy cập
khách. Dùng nội dung/ảnh hiện tại sau mỗi lần build; bố cục xuất chỉ áp dụng
trong trình duyệt tạo file. File xuất không được commit hoặc đưa vào bản deploy.

Để xuất theo tên, mở dashboard RSVP → **Xuất Story theo tên khách**, tìm/tích
chọn khách → **Tải danh sách xuất Story**. Tên lấy từ danh sách hiện tại; file
JSON chỉ có tên và mã khách. Sau đó chạy trong thư mục project này:

```bash
npm run export:story -- --guests ~/Downloads/story-guests.json
```

Công cụ xuất lần lượt `exports/story/<mã-khách>.png` và `<mã-khách>.mp4`, với
“Hi <tên khách>” trong cả ảnh và màn hình máy tính của video. Mỗi lần chạy build
một lần và dùng chung trình duyệt cho cả danh sách. Tiến độ hiện theo từng khách;
nếu một khách lỗi, công cụ tiếp tục với khách còn lại và báo lỗi ở cuối. Chạy lại
sẽ thay file cùng mã, nên mỗi lần sửa tên có thể chỉ chọn lại người cần xuất.

Xuất nhanh một tên mà không cần dashboard:

```bash
npm run export:story -- --name "Nguyễn An"
```

Nếu vừa build xong, có thể dùng `node scripts/export-story.cjs --guests <file>`
để bỏ qua bước build. Video giữ thời lượng 10 giây, chữ trắng mờ dần khi zoom
và kết thúc ở màn hình máy tính.

## Kiểm tra

```bash
npm run typecheck
# Cài browser nếu máy chưa có Chromium:
npx playwright install chromium
npm test
```

`npm test` tạo bản build dùng endpoint thử nghiệm và mock toàn bộ RPC trong
browser, không gửi RSVP hay tạo khách thật. Kiểm tra link không hợp lệ, lưu/
tải lại phản hồi, lỗi mạng và thử lại, tạo link quản trị, điều khiển cửa sổ,
bố cục 320/390/768/1440px và iframe trong phòng 3D. Dùng `CHROMIUM_PATH` nếu
cần chỉ định browser; tự dùng `/usr/bin/chromium` khi có sẵn.

Sau test, chạy lại `npm run build` trước khi dùng preview với Supabase thật.
Credits và nguồn asset: [licenses/UPSTREAM.md](licenses/UPSTREAM.md).
