// components/CanvasElement.tsx
import React from 'react';
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { colors, sizes, radius } from '../theme';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'Image' | 'table';
export type SeaterType = 2 | 4 | 6 | 8 | 12;

export interface ShapeItem {
  id: string;
  type: ShapeType;
  imageUri?: string;
  seaterType?: SeaterType;
  tableNumber?: string;
}

interface ShapeProps {
  item: ShapeItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export default function Shape({
  item,
  selected,
  onSelect,
  onDelete,
  canvasWidth,
  canvasHeight,
}: ShapeProps) {
  const x = useSharedValue(canvasWidth / 2 - sizes.shapeBase / 2);
  const y = useSharedValue(canvasHeight / 2 - sizes.shapeBase / 2);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pan = Gesture.Pan().onChange(e => {
    const nextX = x.value + e.changeX;
    const nextY = y.value + e.changeY;
    x.value = Math.max(0, Math.min(nextX, canvasWidth - sizes.shapeBase));
    y.value = Math.max(0, Math.min(nextY, canvasHeight - sizes.shapeBase));
  });

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(sizes.minScale, Math.min(next, sizes.maxScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate(e => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const composedGesture = Gesture.Simultaneous(pan, pinch, rotate);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const controlsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.wrapper, wrapperStyle]}>
        <Animated.View style={contentStyle}>
          <Pressable onPress={onSelect}>
            {item.type === 'Image' ? (
              <Image
                source={{ uri: item.imageUri }}
                style={[styles.imageElement, selected && styles.selectedBorder]}
              />
            ) : item.type === 'table' ? (
              <TableWithChairs
                seaterType={item.seaterType || 4}
                tableNumber={item.tableNumber}
                selected={selected}
              />
            ) : (
              <View
                style={[
                  item.type === 'square' && styles.square,
                  item.type === 'circle' && styles.circle,
                  item.type === 'triangle' && styles.triangle,
                  item.type === 'diamond' && styles.diamond,
                  selected && styles.selectedBorder,
                ]}
              />
            )}
          </Pressable>
        </Animated.View>

        {selected && (
          <Animated.View style={[styles.controlsLayer, controlsStyle]} pointerEvents="box-none">
            <View style={styles.selectionBox} pointerEvents="none">
              <View style={[styles.cornerDot, styles.topLeftDot]} />
              <View style={[styles.cornerDot, styles.topRightDot]} />
              <View style={[styles.cornerDot, styles.bottomLeftDot]} />
              <View style={[styles.cornerDot, styles.bottomRightDot]} />
              <View style={styles.rotationConnector} />
              <View style={styles.rotationHandle}>
                <Text style={styles.rotationText}>↻</Text>
              </View>
            </View>
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ---------- Table + Chairs ----------

function TableWithChairs({
  seaterType,
  tableNumber,
  selected,
}: {
  seaterType: SeaterType;
  tableNumber?: string;
  selected: boolean;
}) {
  const chairPositions = getChairLayout(seaterType);

  return (
    <View style={tableStyles.wrapper}>
      {chairPositions.map((pos, i) => (
        <View key={i} style={[tableStyles.chair, pos]} />
      ))}
      <View style={[tableStyles.tableBody, selected && styles.selectedBorder]}>
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
      </View>
    </View>
  );
}

function getChairLayout(seaterType: SeaterType) {
  const positions: any[] = [];

  if (seaterType === 2) {
    positions.push({ top: -14, left: 25 }, { bottom: -14, left: 25 });
  } else if (seaterType === 4) {
    positions.push(
      { top: -14, left: 25 },
      { bottom: -14, left: 25 },
      { left: -14, top: 25 },
      { right: -14, top: 25 },
    );
  } else if (seaterType === 6) {
    positions.push(
      { top: -14, left: 10 }, { top: -14, right: 10 },
      { bottom: -14, left: 10 }, { bottom: -14, right: 10 },
      { left: -14, top: 25 }, { right: -14, top: 25 },
    );
  } else {
    const perSide = Math.ceil((seaterType - 2) / 2 / 2);
    const gap = 64 / (perSide + 1);
    for (let i = 1; i <= perSide; i++) {
      positions.push({ top: -14, left: gap * i - 7 });
      positions.push({ bottom: -14, left: gap * i - 7 });
    }
    positions.push({ left: -14, top: 25 }, { right: -14, top: 25 });
  }

  return positions;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  square: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  circle: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    borderRadius: sizes.shapeBase / 2,
    backgroundColor: colors.success,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 32,
    borderRightWidth: 32,
    borderBottomWidth: 64,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primaryDark,
  },
  diamond: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  imageElement: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    borderRadius: radius.sm,
    resizeMode: 'cover',
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: colors.primary,
  },

  controlsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: sizes.shapeBase,
    height: sizes.shapeBase,
  },
  selectionBox: {
    position: 'absolute',
    width: sizes.shapeBase,
    height: sizes.shapeBase,
  },
  cornerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  topLeftDot: { top: -5, left: -5 },
  topRightDot: { top: -5, right: -5 },
  bottomLeftDot: { bottom: -5, left: -5 },
  bottomRightDot: { bottom: -5, right: -5 },
  rotationConnector: {
    position: 'absolute',
    top: -16,
    left: '50%',
    width: 1.5,
    height: 16,
    backgroundColor: colors.primary,
  },
  rotationHandle: {
    position: 'absolute',
    top: -32,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotationText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.sidebarBg,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: 'bold',
    fontSize: 11,
  },
});

const tableStyles = StyleSheet.create({
  wrapper: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.tableFill,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableLabel: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 11,
  },
  chair: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: colors.chairFill,
    borderRadius: 3,
  },
});