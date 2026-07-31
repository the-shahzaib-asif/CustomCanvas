import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, radius, sizes } from '../theme';

interface TableWithChairsProps {
  seaterType: number;
  tableNumber?: string;
  selected: boolean;
  width: number;
  height: number;
  ppf?: number; // Pass dynamic pixels per foot
}

// 1. Calculate dynamic table size using square root scale multiplier
export const getTableDimensions = (seater: number, type: string, ppf: number = 20) => {
  if (type !== 'table') {
    return { width: sizes.shapeBase, height: sizes.shapeBase };
  }

  // Base dimensions at standard PPF = 20
  let baseWidth = 80;
  let baseHeight = 70;

  if (seater <= 2) {
    baseWidth = 70;
    baseHeight = 70;
  } else if (seater === 4) {
    baseWidth = 80;
    baseHeight = 80;
  } else {
    const sideChairs = Math.max(1, Math.ceil((seater - 2) / 2));
    baseWidth = Math.max(100, (sideChairs + 1) * 35);
  }

  // Non-linear scale factor (Square root matches human visual scaling)
  // Clamp scale to a minimum of 0.45 to guarantee visibility on large floors
  const tableScale = Math.max(0.45, Math.sqrt(ppf / 20));

  return {
    width: baseWidth * tableScale,
    height: baseHeight * tableScale,
  };
};

export default function TableWithChairs({
  seaterType,
  tableNumber,
  selected,
  width,
  height,
  ppf = 20,
}: TableWithChairsProps) {
  // Compute the current furniture scale ratio
  const tableScale = Math.max(0.45, Math.sqrt(ppf / 20));

  // Scale furniture subcomponents proportionally
  const chairSize = 16 * tableScale;
  const offsetX = 18 * tableScale;
  const offsetY = 18 * tableScale;
  const plateSize = 8 * tableScale;
  const edgeOffset = 6 * tableScale;

  const chairPositions = getChairLayout(seaterType, width, height, chairSize, offsetX, offsetY);
  const platePositions = getPlateLayout(seaterType, width, height, plateSize, edgeOffset);
  const isRound = seaterType <= 2;

  return (
    <View style={[tableStyles.wrapper, { width: width + offsetX * 2, height: height + offsetY * 2 }]}>
      {/* Render modern comfort chairs */}
      {chairPositions.map((item, i) => (
        <Chair
          key={i}
          position={item.style}
          orientation={item.orientation}
          chairSize={chairSize}
          tableScale={tableScale}
        />
      ))}

      {/* Main Table Top */}
      <View
        style={[
          tableStyles.tableBody,
          {
            width,
            height,
            borderRadius: isRound ? width / 2 : radius.md * tableScale,
            borderWidth: Math.max(1, 1.5 * tableScale),
          },
          selected && tableStyles.tableSelected,
        ]}
      >
        {/* Render plates outlines */}
        {platePositions.map((pos, i) => (
          <View
            key={i}
            style={[
              tableStyles.plate,
              pos,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
                borderWidth: Math.max(0.5, 0.8 * tableScale),
              },
            ]}
          />
        ))}

        {/* Labels scaled proportionally */}
        <Text style={[tableStyles.tableLabel, { fontSize: Math.max(8, 12 * tableScale) }]}>
          {tableNumber || `T${seaterType}`}
        </Text>
        <Text style={[tableStyles.tableSeatCount, { fontSize: Math.max(6, 9 * tableScale), marginTop: 2 * tableScale }]}>
          {seaterType} seats
        </Text>
      </View>
    </View>
  );
}

interface ChairProps {
  position: any;
  orientation: 'top' | 'bottom' | 'left' | 'right';
  chairSize: number;
  tableScale: number;
}

function Chair({ position, orientation, chairSize, tableScale }: ChairProps) {
  const backrestThickness = Math.max(2, 3 * tableScale);
  const cushionSize = chairSize - backrestThickness - 4;

  return (
    <View style={[tableStyles.chair, position, { width: chairSize, height: chairSize, borderWidth: Math.max(0.8, 1 * tableScale) }]}>
      {/* Comfort backrest strip aligned to the outer side */}
      <View
        style={[
          tableStyles.backrest,
          orientation === 'top' && { top: 0, left: 0, right: 0, height: backrestThickness },
          orientation === 'bottom' && { bottom: 0, left: 0, right: 0, height: backrestThickness },
          orientation === 'left' && { left: 0, top: 0, bottom: 0, width: backrestThickness },
          orientation === 'right' && { right: 0, top: 0, bottom: 0, width: backrestThickness },
        ]}
      />
      {/* Cushion */}
      <View style={[tableStyles.cushion, { width: cushionSize, height: cushionSize }]} />
    </View>
  );
}

interface ChairLayoutItem {
  style: any;
  orientation: 'top' | 'bottom' | 'left' | 'right';
}

// Spacing algorithm for chairs scaled dynamically
function getChairLayout(
  seaterType: number,
  width: number,
  height: number,
  cSize: number,
  offX: number,
  offY: number
): ChairLayoutItem[] {
  const list: ChairLayoutItem[] = [];

  if (seaterType === 1) {
    list.push({
      style: { top: -2, left: width / 2 - cSize / 2 + offX },
      orientation: 'top',
    });
    return list;
  }

  if (seaterType === 2) {
    list.push(
      { style: { top: -2, left: width / 2 - cSize / 2 + offX }, orientation: 'top' },
      { style: { bottom: -2, left: width / 2 - cSize / 2 + offX }, orientation: 'bottom' }
    );
    return list;
  }

  if (seaterType === 4) {
    list.push(
      { style: { top: -2, left: width / 2 - cSize / 2 + offX }, orientation: 'top' },
      { style: { bottom: -2, left: width / 2 - cSize / 2 + offX }, orientation: 'bottom' },
      { style: { left: -2, top: height / 2 - cSize / 2 + offY }, orientation: 'left' },
      { style: { right: -2, top: height / 2 - cSize / 2 + offY }, orientation: 'right' }
    );
    return list;
  }

  // Ends
  list.push(
    { style: { left: -2, top: height / 2 - cSize / 2 + offY }, orientation: 'left' },
    { style: { right: -2, top: height / 2 - cSize / 2 + offY }, orientation: 'right' }
  );

  const remaining = seaterType - 2;
  const topChairs = Math.ceil(remaining / 2);
  const bottomChairs = Math.floor(remaining / 2);

  const topGap = width / (topChairs + 1);
  for (let i = 1; i <= topChairs; i++) {
    list.push({
      style: { top: -2, left: topGap * i - cSize / 2 + offX },
      orientation: 'top',
    });
  }

  const bottomGap = width / (bottomChairs + 1);
  for (let i = 1; i <= bottomChairs; i++) {
    list.push({
      style: { bottom: -2, left: bottomGap * i - cSize / 2 + offX },
      orientation: 'bottom',
    });
  }

  return list;
}

// Spacing algorithm for plates scaled dynamically
function getPlateLayout(seaterType: number, width: number, height: number, pSize: number, edgeOff: number) {
  const positions: any[] = [];

  if (seaterType === 1) {
    positions.push({ top: edgeOff, left: width / 2 - pSize / 2 });
    return positions;
  }

  if (seaterType === 2) {
    positions.push(
      { top: edgeOff, left: width / 2 - pSize / 2 },
      { bottom: edgeOff, left: width / 2 - pSize / 2 }
    );
    return positions;
  }

  if (seaterType === 4) {
    positions.push(
      { top: edgeOff, left: width / 2 - pSize / 2 },
      { bottom: edgeOff, left: width / 2 - pSize / 2 },
      { left: edgeOff, top: height / 2 - pSize / 2 },
      { right: edgeOff, top: height / 2 - pSize / 2 }
    );
    return positions;
  }

  positions.push(
    { left: edgeOff, top: height / 2 - pSize / 2 },
    { right: edgeOff, top: height / 2 - pSize / 2 }
  );

  const remaining = seaterType - 2;
  const topChairs = Math.ceil(remaining / 2);
  const bottomChairs = Math.floor(remaining / 2);

  const topGap = width / (topChairs + 1);
  for (let i = 1; i <= topChairs; i++) {
    positions.push({ top: edgeOff, left: topGap * i - pSize / 2 });
  }

  const bottomGap = width / (bottomChairs + 1);
  for (let i = 1; i <= bottomChairs; i++) {
    positions.push({ bottom: edgeOff, left: bottomGap * i - pSize / 2 });
  }

  return positions;
}

const tableStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  tableSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  tableLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableSeatCount: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  chair: {
    position: 'absolute',
    backgroundColor: colors.chairFill,
    borderRadius: 3,
    borderColor: colors.chairBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cushion: {
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  backrest: {
    position: 'absolute',
    backgroundColor: colors.chairBorder,
  },
  plate: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
