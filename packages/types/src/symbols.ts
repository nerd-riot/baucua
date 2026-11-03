export enum SymbolId {
  BAU = 'BAU', // 0: Bầu (Gourd)
  CUA = 'CUA', // 1: Cua (Crab)
  TOM = 'TOM', // 2: Tôm (Shrimp)
  CA  = 'CA',  // 3: Cá (Fish)
  GA  = 'GA',  // 4: Gà (Rooster)
  NAI = 'NAI', // 5: Nai (Stag/Deer)
}

export interface SymbolMeta {
  id: SymbolId;
  nameVi: string;
  nameEn: string;
  index: number;
  color: string;
  cardAsset: string;
  iconAsset: string;
}

export const SYMBOLS: Record<SymbolId, SymbolMeta> = {
  [SymbolId.BAU]: {
    id: SymbolId.BAU,
    nameVi: 'Bầu',
    nameEn: 'Gourd',
    index: 0,
    color: '#84cc16', // lime
    cardAsset: '04_animals_board/card_bau.png',
    iconAsset: '04_animals_board/icon_bau.png',
  },
  [SymbolId.CUA]: {
    id: SymbolId.CUA,
    nameVi: 'Cua',
    nameEn: 'Crab',
    index: 1,
    color: '#ef4444', // red
    cardAsset: '04_animals_board/card_cua.png',
    iconAsset: '04_animals_board/icon_cua.png',
  },
  [SymbolId.TOM]: {
    id: SymbolId.TOM,
    nameVi: 'Tôm',
    nameEn: 'Shrimp',
    index: 2,
    color: '#f97316', // orange
    cardAsset: '04_animals_board/card_tom.png',
    iconAsset: '04_animals_board/icon_tom.png',
  },
  [SymbolId.CA]: {
    id: SymbolId.CA,
    nameVi: 'Cá',
    nameEn: 'Fish',
    index: 3,
    color: '#06b6d4', // cyan
    cardAsset: '04_animals_board/card_ca.png',
    iconAsset: '04_animals_board/icon_ca.png',
  },
  [SymbolId.GA]: {
    id: SymbolId.GA,
    nameVi: 'Gà',
    nameEn: 'Rooster',
    index: 4,
    color: '#eab308', // amber
    cardAsset: '04_animals_board/card_ga.png',
    iconAsset: '04_animals_board/icon_ga.png',
  },
  [SymbolId.NAI]: {
    id: SymbolId.NAI,
    nameVi: 'Nai',
    nameEn: 'Deer',
    index: 5,
    color: '#b45309', // warm brown
    cardAsset: '04_animals_board/card_nai.png',
    iconAsset: '04_animals_board/icon_nai.png',
  },
};

export const ALL_SYMBOLS: SymbolId[] = [
  SymbolId.BAU,
  SymbolId.CUA,
  SymbolId.TOM,
  SymbolId.CA,
  SymbolId.GA,
  SymbolId.NAI,
];
