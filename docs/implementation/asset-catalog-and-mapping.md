# Asset Catalog & Visual Mapping

This document cataloges all visual assets, their resolutions, their roles, and how they are wired into the user interface.

## 1. High-Resolution 3D Mascots (1024x1024)
Generated and tuned to replace low-res crops with high-definition Vietnamese Lunar New Year 3D aesthetics:

| Symbol / Role | High-Res File | Web Public Path | Visual Description |
| :--- | :--- | :--- | :--- |
| **Bầu (Gourd)** | `bau_gourd_1793710600028.jpg` | `/assets/bau.jpg` | Golden-green double gourd tied with red silk ribbon, gold tassels & ancient lucky coin. |
| **Cua (Crab)** | `cua_crab_1793710610754.jpg` | `/assets/cua.jpg` | Smiling red king crab holding an embossed lucky gold coin with festive tassel. |
| **Tôm (Shrimp)** | `tom_shrimp_1793710623195.jpg` | `/assets/tom.jpg` | Curved glossy coral shrimp with glowing eyes and lucky knot charm. |
| **Cá (Fish)** | `ca_fish_1793710633924.jpg` | `/assets/ca.jpg` | Lucky red-orange and gold carp (Cá chép) with flowing fins and water splashes. |
| **Gà (Rooster)** | `ga_rooster_1793710654424.jpg` | `/assets/ga.jpg` | Plump Vietnamese rooster with colorful comb and "Phúc" gold medallion necklace. |
| **Nai (Deer)** | `nai_deer_1793710664113.jpg` | `/assets/nai.jpg` | Gentle golden fawn with antlers decorated with cherry blossoms and lucky knot. |

---

## 2. Gameplay Mechanics: Bát & Đĩa (Bowl & Saucer)

| Item | File Path | Web Public Path | Role in Game Animation |
| :--- | :--- | :--- | :--- |
| **Bát Úp (Ceramic Bowl)** | `bat_bowl_1793710674550.jpg` | `/assets/bat.jpg` | Shakes during `ROLLING` state with physics vibration (`animate-shake`). Lifts upward during `REVEALED` state. |
| **Đĩa Sứ (Ceramic Plate)** | `dia_plate_1793710684233.jpg` | `/assets/dia.jpg` | Porcelain plate with imperial gold rim and red lotus medallion; serves as base for the 3 rolled dice. |

---

## 3. Betting Chips (Coins / Phỉnh Cược)

| Denomination | File Path | Web Public Path | Material & Style |
| :--- | :--- | :--- | :--- |
| **10** | `chip_10_1793710710633.jpg` | `/assets/chip_10.jpg` | Antique bronze coin with imperial border |
| **50** | `chip_50_1793710720774.jpg` | `/assets/chip_50.jpg` | Silver chip with sapphire accents |
| **100** | `chip_100_1793710733112.jpg` | `/assets/chip_100.jpg` | Ruby red & gold royal chip |
| **500** | `chip_500_1793710747457.jpg` | `/assets/chip_500.jpg` | Emerald jade & gold imperial chip |

---

## 4. Guest Character Avatars (`02_characters`)

| Avatar ID | File Path | Vietnamese Name |
| :--- | :--- | :--- |
| `char_boy_ao_dai_xanh` | `/assets/02_characters/char_boy_ao_dai_xanh.png` | Bé Trai Áo Dài Xanh Khăn Đóng |
| `char_girl_ao_dai_do` | `/assets/02_characters/char_girl_ao_dai_do.png` | Bé Gái Áo Dài Đỏ Nón Lá |
| `char_boy_ao_ba_ba_nau` | `/assets/02_characters/char_boy_ao_ba_ba_nau.png` | Bé Trai Áo Bà Ba Nâu Cầm Lì Xì |
| `char_girl_ao_dai_vang` | `/assets/02_characters/char_girl_ao_dai_vang.png` | Bé Gái Áo Dài Vàng Cầm Lì Xì |

---

## 5. UI Elements & Decorations

- **Branding**: `01_branding/logo_bau_cua_online.png` (Main game logo on Lobby)
- **Backgrounds**: `09_backgrounds/bg_1_san_dinh_ngay_tet.png` (Sân đình ngày Tết)
- **Decorations**: Traditional red lanterns, gold clouds, lotus flowers, non la scrolls in `10_decorations/`
- **Audio synthesis**: Web Audio API oscillator (`sound.ts`) providing zero-latency click, chip placement, rolling shaker rattle, and victory fanfare.
