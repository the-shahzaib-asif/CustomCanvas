import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text, useWindowDimensions } from 'react-native';
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
  canvasWidth,
  canvasHeight,
}: {
  item: ShapeItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const x = useSharedValue(100);
  const y = useSharedValue(150);
  const SHAPE_SIZE = 64;

  const pan = Gesture.Pan().onChange(e => {
    const nextX = x.value + e.changeX;
    const nextY = y.value + e.changeY;

    x.value = Math.max(0, Math.min(nextX, canvasWidth - SHAPE_SIZE));
    y.value = Math.max(0, Math.min(nextY, canvasHeight - SHAPE_SIZE));
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
            <Text style={styles.deleteText}>✕</Text>
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

const PALETTE_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#0f172a', 'rgba(219, 216, 45, 1)'];

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const canvasWidth = windowWidth - 72;
  const canvasHeight = windowHeight;

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<'shapes' | 'pencil' | 'eraser'>('pencil');
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [pencilColor, setPencilColor] = useState('#000008ff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [lastPencilPress, setLastPencilPress] = useState(0);

  const handlePencilPress = () => {
    const now = Date.now();
    setShowShapesMenu(false);
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
      {/* Sidebar Navigation */}
      <View style={styles.sidebar}>
        <View style={styles.topLogo}>
          <Text style={styles.logoText}>🎨</Text>
        </View>

        {/* Pencil Button & Color Popover */}
        <View style={styles.relativeWrapper}>
          <Pressable
            style={[styles.sidebarBtn, tool === 'pencil' && styles.activeSidebarBtn]}
            onPress={handlePencilPress}
          >
            <Text style={styles.sidebarEmoji}>✏️</Text>
            <Text style={styles.sidebarLabel}>Pencil</Text>
            <View style={[styles.colorDot, { backgroundColor: pencilColor }]} />
          </Pressable>

          {showColorPicker && (
            <View style={styles.colorPalette}>
              <Text style={styles.popoverTitle}>Brush Color</Text>
              <View style={styles.popoverRow}>
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
            </View>
          )}
        </View>

        {/* Eraser Button */}
        <Pressable
          style={[styles.sidebarBtn, tool === 'eraser' && styles.activeSidebarBtn]}
          onPress={() => {
            setTool('eraser');
            setShowShapesMenu(false);
            setShowColorPicker(false);
          }}
        >
          <Text style={styles.sidebarEmoji}>🧹</Text>
          <Text style={styles.sidebarLabel}>Eraser</Text>
        </Pressable>

        {/* Shapes Menu Button & Popover */}
        <View style={styles.relativeWrapper}>
          <Pressable
            style={[styles.sidebarBtn, tool === 'shapes' && styles.activeSidebarBtn]}
            onPress={() => {
              setTool('shapes');
              setShowColorPicker(false);
              setShowShapesMenu(prev => !prev);
            }}
          >
            <Text style={styles.sidebarEmoji}>⬡</Text>
            <Text style={styles.sidebarLabel}>Shapes</Text>
          </Pressable>

          {showShapesMenu && (
            <View style={styles.shapesPopover}>
              <Text style={styles.popoverTitle}>Add Shape</Text>
              <View style={styles.shapesRow}>
                <Pressable
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    addShape('square');
                    setShowShapesMenu(false);
                  }}
                >
                  <View style={[styles.shapePreview, styles.squarePreview]} />
                  <Text style={styles.shapeOptionText}>Square</Text>
                </Pressable>
                <Pressable
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    addShape('circle');
                    setShowShapesMenu(false);
                  }}
                >
                  <View style={[styles.shapePreview, styles.circlePreview]} />
                  <Text style={styles.shapeOptionText}>Circle</Text>
                </Pressable>
                <Pressable
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    addShape('triangle');
                    setShowShapesMenu(false);
                  }}
                >
                  <View style={[styles.shapePreview, styles.trianglePreview]} />
                  <Text style={styles.shapeOptionText}>Triangle</Text>
                </Pressable>
                <Pressable
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    addShape('diamond');
                    setShowShapesMenu(false);
                  }}
                >
                  <View style={[styles.shapePreview, styles.diamondPreview]} />
                  <Text style={styles.shapeOptionText}>Diamond</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Clear Button */}
        <Pressable style={styles.clearBtn} onPress={clearCanvas}>
          <Text style={styles.clearEmoji}>🗑️</Text>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      {/* Main Canvas Workspace */}
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
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  sidebar: {
    width: 72,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingTop: 30,
    alignItems: 'center',
    gap: 16,
  },
  topLogo: {
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
  },
  relativeWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  sidebarBtn: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeSidebarBtn: {
    backgroundColor: '#1e293b',
  },
  sidebarEmoji: {
    fontSize: 22,
    color: '#cbd5e1',
  },
  sidebarLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  colorDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  colorPalette: {
    position: 'absolute',
    left: 72,
    top: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  popoverTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  popoverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#f8fafc',
  },
  shapesPopover: {
    position: 'absolute',
    left: 72,
    top: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    width: 280,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  shapesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shapeOptionBtn: {
    alignItems: 'center',
    flex: 1,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  shapeOptionText: {
    color: '#cbd5e1',
    fontSize: 9,
    marginTop: 6,
    fontWeight: '600',
  },
  shapePreview: {
    width: 24,
    height: 24,
  },
  squarePreview: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  circlePreview: {
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  trianglePreview: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
  },
  diamondPreview: {
    backgroundColor: '#ec4899',
    transform: [{ rotate: '45deg' }],
    width: 16,
    height: 16,
    marginVertical: 4,
  },
  clearBtn: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearEmoji: {
    fontSize: 20,
  },
  clearText: {
    fontSize: 10,
    color: '#ef4444',
    marginTop: 2,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  shapeWrapper: {
    position: 'absolute',
    padding: 4,
  },
  square: {
    width: 64,
    height: 64,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 32,
    borderRightWidth: 32,
    borderBottomWidth: 64,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
  },
  diamond: {
    width: 64,
    height: 64,
    backgroundColor: '#ec4899',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  deleteBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#0f172a',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
