# 🏮 Bầu Cua Online — Trò Chơi Dân Gian Đón Xuân (Vercel-Native)

> Trò chơi Bầu Cua Tôm Cá trực tuyến nhiều người chơi (2–30 người / phòng), đồ họa Tết Giáp Thìn 3D độ phân giải cao (1024x1024), kiến trúc **đơn nhất (Single Next.js App)** triển khai trực tiếp 100% trên Vercel không cần server hay dịch vụ ngoài.

---

## 🌟 Tính Năng Nổi Bật

1. **Deploy 1-Click Duy Nhất Trên Vercel**:
   - Không chia nhiều bục phức tạp (không cần server riêng, không cần Render/Railway/VPS, không cần Supabase/Redis).
   - Kiến trúc Next.js 15 App Router thuần nhất: Giao diện, âm thanh, game rules, API routes và SSE realtime stream nằm trọn vẹn trong một repository duy nhất.
2. **Multiplayer Thời Gian Thực (SSE + Heartbeat Sync)**:
   - Phòng công khai và phòng riêng tư (mã 6 ký tự như `TET888` + mật mã).
   - Sức chứa **2 đến 30 người chơi** mỗi phòng.
   - Cơ chế **Host Migration**: Khi chủ phòng thoát, quyền Host tự động chuyển sang người chơi kế tiếp.
3. **Đồ Họa 3D Tết 1024x1024 & Animation Siêu Mượt**:
   - 6 linh vật 3D phong cách Tết Việt: Bầu hồ lô, Cua hoàng đế, Tôm biển, Cá chép, Gà trống, Nai vàng.
   - Bát Úp men hoàng gia rung lắc vật lý khi xóc đĩa (`ROLLING`) và nhấc mở kết quả (`REVEALED`).
   - Âm thanh Web Audio API đa tầng (0ms độ trễ, không lo lỗi 404 file mp3).
   - Pháo hoa chúc mừng chiến thắng (`canvas-confetti`).
4. **Quy Tắc Kinh Tế & Chống Gian Lận Tuyệt Đối**:
   - Cryptographic RNG sinh ngẫu nhiên 3 viên xúc xắc trên serverless runtime.
   - Sổ cái điểm bất biến (**Append-Only Ledger**): Khóa điểm cược tức thì (`BET_RESERVE`), chống đặt cược trùng lặp mạng bằng `clientBetId` (Idempotency).
   - Đúng chuẩn kinh tế học truyền thống: Đặt $X$, trúng 1 lần nhận về $2X$ (lãi $+X$), trúng 2 lần nhận về $3X$ (lãi $+2X$), trúng 3 lần nhận về $4X$ (lãi $+3X$).

---

## 📁 Cấu Trúc Dự Án (Single Next.js App)

```
baucua/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── player/reload/route.ts   # Nạp 1,000 điểm miễn phí
│   │   │   └── rooms/
│   │   │       ├── route.ts             # Danh sách & tạo phòng
│   │   │       └── [code]/
│   │   │           ├── route.ts         # Trạng thái phòng
│   │   │           ├── join/route.ts    # Vào phòng
│   │   │           ├── leave/route.ts   # Rời phòng & chuyển Host
│   │   │           ├── start/route.ts   # Bắt đầu vòng cược
│   │   │           ├── bet/route.ts     # Đặt cược
│   │   │           ├── lock/route.ts    # Khóa cược & mở bát
│   │   │           ├── chat/route.ts    # Chat & sticker
│   │   │           └── events/route.ts  # Server-Sent Events (SSE)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                      # Giao diện bàn cược, đĩa xóc, lobby, chat, v.v.
│   ├── engine/                          # Thuật toán xúc xắc, FSM, tính tiền thưởng, sổ cái
│   ├── types/                           # Khai báo TypeScript cho toàn bộ game
│   └── lib/
│       ├── game-client.ts               # Client giao tiếp API & SSE stream
│       ├── room-store.ts                # Quản lý phòng & sự kiện Serverless
│       └── sound.ts                     # Bộ tổng hợp âm thanh Web Audio API
├── public/
│   └── assets/                          # Bộ ảnh 3D và UI đầy đủ
├── tests/                               # 15 Unit tests cho Game Engine & Room Store
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vercel.json
├── package.json
└── README.md
```

---

## 🚀 Hướng Dẫn Deploy Lên Vercel (Cực Kỳ Đơn Giản)

1. Đẩy code lên GitHub (`git push`).
2. Vào [vercel.com](https://vercel.com) $\to$ Nhấn **Add New Project** $\to$ Chọn repo này.
3. Nhấn **Deploy** (giữ nguyên mọi thiết lập mặc định, không cần cấu hình thêm bất kỳ cài đặt hay biến môi trường nào!).
4. Web game sẽ hoạt động ngay lập tức với domain của bạn!

---

## 💻 Chạy Tại Máy Local

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Khởi động môi trường phát triển
pnpm dev

# 3. Chạy toàn bộ 15 bài kiểm thử
pnpm test

# 4. Build thử nghiệm sản phẩm
pnpm build
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để trải nghiệm.
