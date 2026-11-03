# 🏮 Bầu Cua Online — Trò Chơi Dân Gian Đón Xuân

> Trò chơi Bầu Cua Tôm Cá trực tuyến nhiều người chơi (Multiplayer Social Room, 2–30 người), đồ họa Tết Giáp Thìn đậm đà bản sắc Việt, hỗ trợ Guest Nickname (không cần đăng ký tài khoản), luật chơi chặt chẽ, server authoritative và animation mượt mà.

---

## 🌟 Tính Năng Nổi Bật

1. **Multiplayer Thời Gian Thực**:
   - Kiến trúc phòng chơi công khai (Public Room Discovery) và phòng riêng tư (Private Room có mã 6 ký tự + mật khẩu).
   - Sức chứa linh hoạt từ **2 đến 30 người chơi** mỗi phòng.
   - Cơ chế **Host Migration**: Khi chủ phòng thoát hoặc mất kết nối, hệ thống tự động chỉ định người chơi kế tiếp làm Host.
2. **Animation Siêu Mượt & Trải Nghiệm Awesome**:
   - Bộ linh vật 3D độ phân giải cao **1024x1024** phong cách Tết (Bầu, Cua, Tôm, Cá, Gà, Nai).
   - Mô phỏng **Bát Úp men hoàng gia & Đĩa sứ hoa sen** rung lắc xóc đĩa (`ROLLING`) và hiệu ứng nhấc bát mở kết quả (`REVEALED`).
   - Pháo hoa chúc mừng chiến thắng rực rỡ (`canvas-confetti`).
   - Âm thanh sống động đa tầng bằng **Web Audio API** (không sợ lỗi 404 file mp3, độ trễ 0ms): tiếng lắc xúc xắc xủng xoảng, tiếng đặt phỉnh cược, tiếng chuông thắng trận, tiếng đếm ngược.
3. **Quy Tắc Kinh Tế & Kiểm Soát Gian Lận Tuyệt Đối**:
   - Server-side cryptographic RNG (`node:crypto`) quyết định kết quả 3 viên xúc xắc.
   - Sổ cái điểm bất biến (**Append-Only Ledger**): Khóa điểm cược tức thì (`BET_RESERVE`), không bao giờ bị âm điểm, chống trùng lặp request với `clientBetId` (Idempotency).
   - Đúng chuẩn kinh tế học truyền thống: Đặt $X$, trúng 1 lần nhận về $2X$ (lãi $+X$), trúng 2 lần nhận về $3X$ (lãi $+2X$), trúng 3 lần nhận về $4X$ (lãi $+3X$).
4. **Kiến Trúc Tối Giản, Chạy & Deploy Ngay Lập Tức**:
   - Không yêu cầu cấu hình Supabase phức tạp ở giai đoạn đầu (`In-Memory Ledger & Room State`).
   - Sẵn sàng tích hợp Supabase PostgreSQL + RLS ở Phase 7 theo đúng thiết kế tại `docs/architecture/ADR-003-data-schema-and-persistence.md`.

---

## 🏗️ Cấu Trúc Monorepo (pnpm + Turborepo)

```
baucua/
├── apps/
│   ├── web/                    # Next.js 15 App Router + React 19 + Tailwind CSS + Framer Motion
│   └── server/                 # Fastify / Node http + Socket.io (Authoritative Room Gateway)
├── packages/
│   ├── types/                  # Domain Types, Socket Contracts, DTOs
│   └── engine/                 # Pure TypeScript Rules, Cryptographic RNG, Settlement Math, Ledger
├── bau_cua_assets/
│   ├── high_res/               # 12 Asset 3D độ phân giải cao 1024x1024
│   └── cropped/                # 68 Asset UI gốc đã được cắt chuẩn hóa
├── docs/
│   ├── architecture/           # ADR-001 -> ADR-004, Sơ đồ hệ thống Mermaid
│   └── implementation/         # Implementation Plan, Event Contracts, Asset Catalog
├── turbo.json                  # Turborepo task pipeline
├── package.json
└── README.md
```

---

## 🚀 Khởi Động Nhanh (Local Development)

Yêu cầu: **Node.js >= 20** và **pnpm >= 9**.

### 1. Cài đặt dependencies:
```bash
pnpm install
```

### 2. Chạy toàn bộ hệ thống (Web + Realtime Server):
```bash
pnpm dev
```
- **Web App**: `http://localhost:3000`
- **Realtime Server**: `http://localhost:3001` (Endpoint Health: `http://localhost:3001/health`)

---

## 🧪 Chạy Test Suite

Toàn bộ logic thanh toán, xác suất xúc xắc, và giao thức realtime đã được kiểm thử:

```bash
pnpm test
```

- **`@bau-cua/engine`**: 10 tests kiểm tra chính xác gross payout, net profit, chặn cược quá số dư, idempotency key.
- **`@bau-cua/server`**: Integration test kết nối đa client (Host tạo phòng, Player 2 vào cược, đồng bộ số dư thời gian thực).

---

## 📦 Triển Khai Sản Phẩm (Production Deployment)

### Cách 1: Chạy bằng Docker
```bash
docker build -t baucua-online .
docker run -p 3000:3000 -p 3001:3001 baucua-online
```

### Cách 2: Triển khai Độc Lập
- **Apps/Web**: Deploy lên [Vercel](https://vercel.com) với biến môi trường `NEXT_PUBLIC_SOCKET_URL=https://your-server-domain.com`.
- **Apps/Server**: Deploy lên [Render](https://render.com), [Railway](https://railway.app), hoặc [Fly.io] với lệnh `pnpm --filter @bau-cua/server start`.
