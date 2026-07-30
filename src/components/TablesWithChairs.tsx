// components/TablesWithChairs.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, radius, sizes } from '../theme';

interface TableWithChairsProps {
  seaterType: number;
  tableNumber?: string;
  selected: boolean;
  width: number;
  height: number;
}

export const getTableDimensions = (seater: number, type: string) => {
  if (type !== 'table') {
    return { width: sizes.shapeBase, height: sizes.shapeBase };
  }
  if (seater <= 2) {
    return { width: 70, height: 70 }; // Round cafe table
  }
  if (seater === 4) {
    return { width: 80, height: 80 }; // Square table
  }
  // Dynamic rectangle width stretching based on chair count
  const sideChairs = Math.max(1, Math.ceil((seater - 2) / 2));
  const width = Math.max(100, (sideChairs + 1) * 35);
  return { width, height: 70 };
};

export default function TableWithChairs({
  seaterType,
  tableNumber,
  selected,
  width,
  height,
}: TableWithChairsProps) {
  const chairPositions = getChairLayout(seaterType, width, height);
  const platePositions = getPlateLayout(seaterType, width, height);
  const isRound = seaterType <= 2;

  return (
    <View style={[tableStyles.wrapper, { width: width + 36, height: height + 36 }]}>
      {/* 1. Render modern architectural chairs surrounding the table */}
      {chairPositions.map((item, i) => (
        <Chair key={i} position={item.style} orientation={item.orientation} />
      ))}

      {/* 2. Main Table Top */}
      <View
        style={[
          tableStyles.tableBody,
          {
            width,
            height,
            borderRadius: isRound ? width / 2 : radius.md,
          },
          selected && tableStyles.tableSelected,
        ]}
      >
        {/* Render plates on the table surface */}
        {platePositions.map((pos, i) => (
          <View key={i} style={[tableStyles.plate, pos]} />
        ))}

        {/* Labels */}
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
        <Text style={tableStyles.tableSeatCount}>{seaterType} seats</Text>
      </View>
    </View>
  );
}

interface ChairProps {
  position: any;
  orientation: 'top' | 'bottom' | 'left' | 'right';
}

// Reusable custom Chair component that draws cushions and comfort backrests
function Chair({ position, orientation }: ChairProps) {
  return (
    <View style={[tableStyles.chair, position]}>
      {/* Backrest bar positioned dynamically on the outer edge */}
      <View style={[tableStyles.backrest, tableStyles[`backrest_${orientation}`]]} />
      {/* Comfort inner seat cushion */}
      <View style={tableStyles.cushion} />
    </View>
  );
}

// Spacings configuration
const chairSize = 16;
const offsetX = 18;
const offsetY = 18;
const plateSize = 8;

interface ChairLayoutItem {
  style: any;
  orientation: 'top' | 'bottom' | 'left' | 'right';
}

// Spacing algorithm for chairs
function getChairLayout(seaterType: number, width: number, height: number): ChairLayoutItem[] {
  const list: ChairLayoutItem[] = [];

  if (seaterType === 1) {
    list.push({
      style: { top: -2, left: width / 2 - chairSize / 2 + offsetX },
      orientation: 'top',
    });
    return list;
  }

  if (seaterType === 2) {
    list.push(
      { style: { top: -2, left: width / 2 - chairSize / 2 + offsetX }, orientation: 'top' },
      { style: { bottom: -2, left: width / 2 - chairSize / 2 + offsetX }, orientation: 'bottom' }
    );
    return list;
  }

  if (seaterType === 4) {
    list.push(
      { style: { top: -2, left: width / 2 - chairSize / 2 + offsetX }, orientation: 'top' },
      { style: { bottom: -2, left: width / 2 - chairSize / 2 + offsetX }, orientation: 'bottom' },
      { style: { left: -2, top: height / 2 - chairSize / 2 + offsetY }, orientation: 'left' },
      { style: { right: -2, top: height / 2 - chairSize / 2 + offsetY }, orientation: 'right' }
    );
    return list;
  }

  // Left and Right ends get 1 chair each
  list.push(
    { style: { left: -2, top: height / 2 - chairSize / 2 + offsetY }, orientation: 'left' },
    { style: { right: -2, top: height / 2 - chairSize / 2 + offsetY }, orientation: 'right' }
  );

  const remaining = seaterType - 2;
  const topChairs = Math.ceil(remaining / 2);
  const bottomChairs = Math.floor(remaining / 2);

  const topGap = width / (topChairs + 1);
  for (let i = 1; i <= topChairs; i++) {
    list.push({
      style: { top: -2, left: topGap * i - chairSize / 2 + offsetX },
      orientation: 'top',
    });
  }

  const bottomGap = width / (bottomChairs + 1);
  for (let i = 1; i <= bottomChairs; i++) {
    list.push({
      style: { bottom: -2, left: bottomGap * i - chairSize / 2 + offsetX },
      orientation: 'bottom',
    });
  }

  return list;
}

// Spacing algorithm for plates on table surface
function getPlateLayout(seaterType: number, width: number, height: number) {
  const positions: any[] = [];
  const edgeOffset = 6;

  if (seaterType === 1) {
    positions.push({ top: edgeOffset, left: width / 2 - plateSize / 2 });
    return positions;
  }

  if (seaterType === 2) {
    positions.push(
      { top: edgeOffset, left: width / 2 - plateSize / 2 },
      { bottom: edgeOffset, left: width / 2 - plateSize / 2 }
    );
    return positions;
  }

  if (seaterType === 4) {
    positions.push(
      { top: edgeOffset, left: width / 2 - plateSize / 2 },
      { bottom: edgeOffset, left: width / 2 - plateSize / 2 },
      { left: edgeOffset, top: height / 2 - plateSize / 2 },
      { right: edgeOffset, top: height / 2 - plateSize / 2 }
    );
    return positions;
  }

  // Left/Right plates
  positions.push(
    { left: edgeOffset, top: height / 2 - plateSize / 2 },
    { right: edgeOffset, top: height / 2 - plateSize / 2 }
  );

  const remaining = seaterType - 2;
  const topChairs = Math.ceil(remaining / 2);
  const bottomChairs = Math.floor(remaining / 2);

  const topGap = width / (topChairs + 1);
  for (let i = 1; i <= topChairs; i++) {
    positions.push({ top: edgeOffset, left: topGap * i - plateSize / 2 });
  }

  const bottomGap = width / (bottomChairs + 1);
  for (let i = 1; i <= bottomChairs; i++) {
    positions.push({ bottom: edgeOffset, left: bottomGap * i - plateSize / 2 });
  }

  return positions;
}

const tableStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    backgroundColor: '#1E293B', // Sleek modern slate slate-800
    borderWidth: 1.5,
    borderColor: '#475569', // Slate-600 border
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
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tableSeatCount: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  chair: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: colors.chairFill,
    borderRadius: 4,
    borderWidth: 1,
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
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)', // light comfort cushion
  },
  backrest: {
    position: 'absolute',
    backgroundColor: colors.chairBorder,
  },
  backrest_top: {
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  backrest_bottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  backrest_left: {
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  backrest_right: {
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  plate: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // subtle transparent plate
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
