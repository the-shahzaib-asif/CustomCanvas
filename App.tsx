import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';

type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond';

interface ShapeItem {
  id: string;
  type: ShapeType;
}

function Shape({
  item,
  selected,
  onSelect,
  onDelete,
}: {
  item: ShapeItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const x = useSharedValue(100);
  const y = useSharedValue(150);

  const pan = Gesture.Pan().onChange(e => {
    x.value += e.changeX;
    y.value += e.changeY;
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.shapeWrapper, animatedStyle]}>
        <Pressable onPress={onSelect}>
          <View
            style={[
              item.type === 'square' && styles.square,
              item.type === 'circle' && styles.circle,
              item.type === 'triangle' && styles.triangle,
              item.type === 'diamond' && styles.diamond,
              selected && styles.selectedBorder,
            ]}
          />
        </Pressable>
        {selected && (
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteText}>X</Text>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

interface DrawingPath {
  path: SkPath;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

const PALETTE_COLORS = ['#f53333', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#000000'];

export default function App() {
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'shapes' | 'pencil' | 'eraser'>('shapes');
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [pencilColor, setPencilColor] = useState('#f53333');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastPencilPress, setLastPencilPress] = useState(0);

  const handlePencilPress = () => {
    const now = Date.now();
    if (now - lastPencilPress < 300) {
      setShowColorPicker(prev => !prev);
    } else {
      setTool('pencil');
    }
    setLastPencilPress(now);
  };

  const pencilPan = Gesture.Pan()
    .runOnJS(true)
    .onStart((e: any) => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      setCurrentPath({
        path,
        color: pencilColor,
        strokeWidth: 4,
        isEraser: false,
      });
    })
    .onUpdate((e: any) => {
      if (currentPath) {
        currentPath.path.lineTo(e.x, e.y);
        setCurrentPath({ ...currentPath, path: currentPath.path.copy() });
      }
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath(null);
      }
    });

  const eraserPan = Gesture.Pan()
    .runOnJS(true)
    .onStart((e: any) => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      setCurrentPath({
        path,
        color: '#000000',
        strokeWidth: 24,
        isEraser: true,
      });
    })
    .onUpdate((e: any) => {
      if (currentPath) {
        currentPath.path.lineTo(e.x, e.y);
        setCurrentPath({ ...currentPath, path: currentPath.path.copy() });
      }
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath(null);
      }
    });

  const addShape = (type: ShapeType) => {
    const newShape: ShapeItem = { id: Date.now().toString(), type };
    setShapes(prev => [...prev, newShape]);
    setTool('shapes');
  };

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    setShapes([]);
    setPaths([]);
    setCurrentPath(null);
    setSelectedId(null);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.sidebar}>
        <Pressable style={styles.sidebarBtn} onPress={() => addShape('square')}>
          <View style={styles.squareIcon} />
        </Pressable>
        <Pressable style={styles.sidebarBtn} onPress={() => addShape('circle')}>
          <View style={styles.circleIcon} />
        </Pressable>
        <Pressable style={styles.sidebarBtn} onPress={() => addShape('triangle')}>
          <View style={styles.triangleIcon} />
        </Pressable>
        <Pressable style={styles.sidebarBtn} onPress={() => addShape('diamond')}>
          <View style={styles.diamondIcon} />
        </Pressable>
        
        <View style={{ position: 'relative', zIndex: 10 }}>
          <Pressable
            style={[styles.sidebarBtn, tool === 'pencil' && styles.activeSidebarBtn]}
            onPress={handlePencilPress}
          >
            <Text style={styles.pencilIcon}>✏️</Text>
            <View style={[styles.colorDot, { backgroundColor: pencilColor }]} />
          </Pressable>

          {showColorPicker && (
            <View style={styles.colorPalette}>
              {PALETTE_COLORS.map(color => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    pencilColor === color && styles.selectedColorOption,
                  ]}
                  onPress={() => {
                    setPencilColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.sidebarBtn, tool === 'eraser' && styles.activeSidebarBtn]}
          onPress={() => setTool('eraser')}
        >
          <Text style={styles.eraserIcon}>🧹</Text>
        </Pressable>

        <Pressable style={styles.clearBtn} onPress={clearCanvas}>
          <Text> Clear</Text>
        </Pressable>
      </View>

      <View style={styles.canvas}>
        {tool === 'pencil' || tool === 'eraser' ? (
          <GestureDetector gesture={tool === 'pencil' ? pencilPan : eraserPan}>
            <View style={StyleSheet.absoluteFill}>
              <Canvas style={StyleSheet.absoluteFill}>
                {paths.map((p, idx) => (
                  <Path
                    key={idx}
                    path={p.path}
                    color={p.color}
                    strokeWidth={p.strokeWidth}
                    style="stroke"
                    strokeCap="round"
                    strokeJoin="round"
                    blendMode={p.isEraser ? 'clear' : 'srcOver'}
                  />
                ))}
                {currentPath && (
                  <Path
                    path={currentPath.path}
                    color={currentPath.color}
                    strokeWidth={currentPath.strokeWidth}
                    style="stroke"
                    strokeCap="round"
                    strokeJoin="round"
                    blendMode={currentPath.isEraser ? 'clear' : 'srcOver'}
                  />
                )}
              </Canvas>
            </View>
          </GestureDetector>
        ) : (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Canvas style={StyleSheet.absoluteFill}>
              {paths.map((p, idx) => (
                <Path
                  key={idx}
                  path={p.path}
                  color={p.color}
                  strokeWidth={p.strokeWidth}
                  style="stroke"
                  strokeCap="round"
                  strokeJoin="round"
                  blendMode={p.isEraser ? 'clear' : 'srcOver'}
                />
              ))}
            </Canvas>
          </View>
        )}

        {shapes.map(item => (
          <Shape
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={() => setSelectedId(item.id)}
            onDelete={() => deleteShape(item.id)}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },

  sidebar: {
    width: 70,
    backgroundColor: '#e5e7eb',
    paddingTop: 40,
    alignItems: 'center',
    gap: 20,
  },
  activeSidebarBtn: {
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
  },
  pencilIcon: {
    fontSize: 24,
  },
  eraserIcon: {
    fontSize: 24,
  },

  sidebarBtn: {
    padding: 10,
  },

  squareIcon: { width: 30, height: 30, backgroundColor: '#3b82f6' },
  circleIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#10b981' },
  triangleIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
  },
  diamondIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#f53333ff',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },

  canvas: { flex: 1, backgroundColor: '#f9fafb' },

  shapeWrapper: { position: 'absolute' },

  square: { width: 60, height: 60, backgroundColor: '#3b82f6', borderRadius: 6 },
  circle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#10b981' },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
  },
  diamond: {
    width: 60,
    height: 60,
    backgroundColor: '#f53333ff',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
  },

  selectedBorder: { borderWidth: 2, borderColor: 'red' },

  deleteBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: 'red',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  clearBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(247, 247, 247, 1)',
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPalette: {
    position: 'absolute',
    left: 75,
    top: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#000',
  },
  colorDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  }
});
