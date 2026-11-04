export interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  points: number;
  deviceId: string;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
  connected: boolean;
  joinedAt: number;
  lastActiveAt: number;
}

export type AvatarId =
  | 'char_boy_ao_dai_xanh'
  | 'char_girl_ao_dai_do'
  | 'char_boy_ao_ba_ba_nau'
  | 'char_girl_ao_dai_vang';

export const DEFAULT_AVATARS: { id: AvatarId; nameVi: string; assetPath: string }[] = [
  {
    id: 'char_boy_ao_dai_xanh',
    nameVi: 'Bé Trai Áo Dài Xanh',
    assetPath: '02_characters/char_boy_ao_dai_xanh.png',
  },
  {
    id: 'char_girl_ao_dai_do',
    nameVi: 'Bé Gái Áo Dài Đỏ',
    assetPath: '02_characters/char_girl_ao_dai_do.png',
  },
  {
    id: 'char_boy_ao_ba_ba_nau',
    nameVi: 'Bé Trai Áo Bà Ba',
    assetPath: '02_characters/char_boy_ao_ba_ba_nau.png',
  },
  {
    id: 'char_girl_ao_dai_vang',
    nameVi: 'Bé Gái Áo Dài Vàng',
    assetPath: '02_characters/char_girl_ao_dai_vang.png',
  },
];

export const INITIAL_POINTS = 1000;
