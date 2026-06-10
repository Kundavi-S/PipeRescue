export enum TileType {
  EMPTY    = 'empty',
  STRAIGHT = 'straight',
  ELBOW    = 'elbow',
  START    = 'start',
  END      = 'end',
}

const BASE: Record<TileType, boolean[]> = {
  [TileType.EMPTY]:    [false, false, false, false],
  [TileType.STRAIGHT]: [false, true,  false, true ],
  [TileType.ELBOW]:    [true,  true,  false, false],
  [TileType.START]:    [false, true,  false, false],
  [TileType.END]:      [false, false, false, true ],
};

export function getConnections(type: TileType, rotation: number): boolean[] {
  const base = BASE[type];
  const steps = ((rotation / 90) % 4 + 4) % 4;
  return [
    base[(0 - steps + 4) % 4],
    base[(1 - steps + 4) % 4],
    base[(2 - steps + 4) % 4],
    base[(3 - steps + 4) % 4],
  ];
}


