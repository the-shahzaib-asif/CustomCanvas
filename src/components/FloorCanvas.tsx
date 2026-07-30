import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';
import Shape, { ShapeItem } from './CanvasElement';
import { colors, radius, sizes } from '../theme';

interface FloorCanvasProps {
  floorWidthFt: number;
  floorHeightFt: number;
  shapes: ShapeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  scale: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  canvasRotation: SharedValue<number>;
  onDeselect: () => void;
  ppf: number; // Dynamic pixels per foot based on floor size
}

export default function FloorCanvas({
  floorWidthFt,
  floorHeightFt,
  shapes,
  selectedId,
  onSelect,
  onDelete,
  scale,
  panX,
  panY,
  canvasRotation,
  onDeselect,
  ppf,
}: FloorCanvasProps) {
  const CONTENT_W = floorWidthFt * ppf;
  const CONTENT_H = floorHeightFt * ppf;

  // Custom Reanimated style for camera transformations
  const canvasAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
      { rotate: `${canvasRotation.value}rad` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.floorContainer,
        {
          width: CONTENT_W,
          height: CONTENT_H,
          marginLeft: -CONTENT_W / 2,
          marginTop: -CONTENT_H / 2,
        },
        canvasAnimStyle,
      ]}
    >
      <View style={styles.floorSurface}>
        {/* Only render dotted pattern if PPF is large enough to prevent SVG tiling crash */}
        {ppf >= 6 ? (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern
                id="gridPattern"
                width={ppf} // matches 1 foot dynamically
                height={ppf}
                patternUnits="userSpaceOnUse"
              >
                <Circle cx={ppf / 2} cy={ppf / 2} r={1.5} fill={colors.gridDot} />
              </Pattern>
            </Defs>
            <Rect width={CONTENT_W} height={CONTENT_H} fill="url(#gridPattern)" />
          </Svg>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
        )}
      </View>

      {/* Floor surface tap target to deselect elements */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDeselect}
      />

      {/* Render Placed Tables/Shapes */}
      {shapes.map(item => (
        <Shape
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onSelect={() => onSelect(item.id)}
          onDelete={() => onDelete(item.id)}
          canvasWidth={CONTENT_W}
          canvasHeight={CONTENT_H}
          canvasScale={scale} // Pass scale to maintain drag speed
          canvasRotation={canvasRotation}
          ppf={ppf}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floorContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  floorSurface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
});
