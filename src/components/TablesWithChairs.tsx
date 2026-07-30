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
  // For custom/larger sizes, stretch table width dynamically
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
  const isRound = seaterType <= 2;

  return (
    <View style={[tableStyles.wrapper, { width: width + 36, height: height + 36 }]}>
      {/* Render chairs surrounding the table */}
      {chairPositions.map((pos, i) => (
        <View key={i} style={[tableStyles.chair, pos]} />
      ))}

      {/* Main Table Body */}
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
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
        <Text style={tableStyles.tableSeatCount}>{seaterType} seats</Text>
      </View>
    </View>
  );
}

// Generic layout algorithm for placing chairs cleanly around table sides
function getChairLayout(seaterType: number, width: number, height: number) {
  const positions: any[] = [];
  const chairSize = 16;
  const offsetX = 18; // offset matching wrapper borders
  const offsetY = 18;

  if (seaterType === 1) {
    positions.push({ top: -2, left: width / 2 - chairSize / 2 + offsetX });
    return positions;
  }

  if (seaterType === 2) {
    positions.push(
      { top: -2, left: width / 2 - chairSize / 2 + offsetX },
      { bottom: -2, left: width / 2 - chairSize / 2 + offsetX },
    );
    return positions;
  }

  if (seaterType === 4) {
    positions.push(
      { top: -2, left: width / 2 - chairSize / 2 + offsetX },
      { bottom: -2, left: width / 2 - chairSize / 2 + offsetX },
      { left: -2, top: height / 2 - chairSize / 2 + offsetY },
      { right: -2, top: height / 2 - chairSize / 2 + offsetY },
    );
    return positions;
  }

  // Generic rectangular distribution for custom seater counts
  // Left and Right ends get 1 chair each
  positions.push(
    { left: -2, top: height / 2 - chairSize / 2 + offsetY },
    { right: -2, top: height / 2 - chairSize / 2 + offsetY },
  );

  // Remaining chairs are distributed along the top and bottom sides
  const remaining = seaterType - 2;
  const topChairs = Math.ceil(remaining / 2);
  const bottomChairs = Math.floor(remaining / 2);

  const topGap = width / (topChairs + 1);
  for (let i = 1; i <= topChairs; i++) {
    positions.push({ top: -2, left: topGap * i - chairSize / 2 + offsetX });
  }

  const bottomGap = width / (bottomChairs + 1);
  for (let i = 1; i <= bottomChairs; i++) {
    positions.push({ bottom: -2, left: bottomGap * i - chairSize / 2 + offsetX });
  }

  return positions;
}

const tableStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    backgroundColor: colors.tableFill,
    borderWidth: 1.5,
    borderColor: colors.tableBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tableSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tableLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tableSeatCount: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 1,
    fontWeight: '600',
  },
  chair: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: colors.chairFill,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.chairBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
