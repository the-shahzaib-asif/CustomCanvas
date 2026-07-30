import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';

import Shape, { ShapeItem, SeaterType } from './components/CanvasElement';
import DrawingCanvas, { DrawingPath } from './components/DrawingCanvas';
import { colors, spacing, sizes, radius } from './theme';

const PENCIL_COLORS = ['#111827', colors.primary, '#10B981', '#3B82F6', '#EC4899', '#F59E0B'];
const SEATER_OPTIONS: SeaterType[] = [2, 4, 6, 8, 12];

type Tool = 'shapes' | 'pencil' | 'eraser';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const canvasWidth = isSidebarOpen ? windowWidth - sizes.sidebarWidth : windowWidth;
  const canvasHeight = windowHeight;

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('shapes'); // Default to shapes mode for placing tables

  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [pencilColor, setPencilColor] = useState(PENCIL_COLORS[1]); // Default to primary color

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [lastPencilPress, setLastPencilPress] = useState(0);

  // ── Canvas Zoom & Pan Shared Values ──
  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  // Limits to prevent losing the canvas workspace
  const minScale = 0.5;
  const maxScale = 2.5;
  const panLimit = 600;

  // Animated transform style for the canvas
  const canvasAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  const closeAllPopovers = () => {
    setShowColorPicker(false);
    setShowTableMenu(false);
  };

  const handlePencilPress = () => {
    const now = Date.now();
    setShowTableMenu(false);
    if (now - lastPencilPress < 300) {
      setShowColorPicker(prev => !prev);
    } else {
      setTool('pencil');
      setShowColorPicker(false);
    }
    setLastPencilPress(now);
  };

  // ── GESTURE HANDLERS ──

  // 1. Parent 2-finger Gestures (Pinch to Zoom & Two-finger Pan)
  // These are active anywhere on screen, but only trigger with 2 fingers,
  // so they never conflict with single-finger table dragging.
  const parentPan = Gesture.Pan()
    .minPointers(2)
    .onChange(e => {
      const nextX = panX.value + e.changeX;
      const nextY = panY.value + e.changeY;
      panX.value = Math.max(-panLimit, Math.min(panLimit, nextX));
      panY.value = Math.max(-panLimit, Math.min(panLimit, nextY));
    });

  const parentPinch = Gesture.Pinch()
    .onChange(e => {
      const nextScale = scale.value * e.scaleChange;
      scale.value = Math.min(maxScale, Math.max(minScale, nextScale));
    });

  const parentGesture = Gesture.Simultaneous(parentPan, parentPinch);

  // 2. Background-only 1-finger Pan Gesture
  // Placed on the empty background layer, so it only triggers when dragging empty space.
  const bgPan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .enabled(tool === 'shapes')
    .onChange(e => {
      const nextX = panX.value + e.changeX;
      const nextY = panY.value + e.changeY;
      panX.value = Math.max(-panLimit, Math.min(panLimit, nextX));
      panY.value = Math.max(-panLimit, Math.min(panLimit, nextY));
    });

  const addTable = (seaterType: SeaterType) => {
    const tableCount = shapes.filter(s => s.type === 'table').length + 1;
    const newTable: ShapeItem = {
      id: Date.now().toString(),
      type: 'table',
      seaterType,
      tableNumber: `T${tableCount}`,
    };
    setShapes(prev => [...prev, newTable]);
    setTool('shapes');
    setShowTableMenu(false);
  };

  const addImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
      if (response.didCancel || response.errorMessage) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        const newImage: ShapeItem = { id: Date.now().toString(), type: 'Image', imageUri: uri };
        setShapes(prev => [...prev, newImage]);
        setTool('shapes');
      }
    });
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
      {isSidebarOpen && (
        <Sidebar
          tool={tool}
          pencilColor={pencilColor}
          showColorPicker={showColorPicker}
          showTableMenu={showTableMenu}
          onPencilPress={handlePencilPress}
          onPickColor={color => {
            setPencilColor(color);
            setShowColorPicker(false);
          }}
          onEraserPress={() => {
            setTool('eraser');
            closeAllPopovers();
          }}
          onTablesPress={() => {
            setTool('shapes');
            setShowColorPicker(false);
            setShowTableMenu(prev => !prev);
          }}
          onSelectSeater={addTable}
          onImagePress={addImage}
          onClearPress={clearCanvas}
          onCollapse={() => setIsSidebarOpen(false)}
        />
      )}

      <View style={styles.canvas}>
        {!isSidebarOpen && (
          <Pressable style={styles.floatingOpenBtn} onPress={() => setIsSidebarOpen(true)}>
            <Text style={styles.floatingOpenText}>➡️</Text>
          </Pressable>
        )}

        {/* Parent GestureDetector handles two-finger pan & pinch zoom anywhere on the canvas */}
        <GestureDetector gesture={parentGesture}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[StyleSheet.absoluteFill, canvasAnimStyle]}>
              {/* Background Layer: Handles tapping empty space to deselect and one-finger background panning */}
              <GestureDetector gesture={bgPan}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    setSelectedId(null);
                    closeAllPopovers();
                  }}
                >
                  {/* Subtle draft grid dots can sit here in future */}
                </Pressable>
              </GestureDetector>

              {/* Drawing layer (ignores touches when in Shapes mode to let them pass to background) */}
              <View
                style={StyleSheet.absoluteFill}
                pointerEvents={tool === 'shapes' ? 'none' : 'box-none'}
              >
                <DrawingCanvas
                  paths={paths}
                  setPaths={setPaths}
                  currentPath={currentPath}
                  setCurrentPath={setCurrentPath}
                  tool={tool}
                  pencilColor={pencilColor}
                />
              </View>

              {/* Shapes / Tables layer (sits on top, catches touches first) */}
              {shapes.map(item => (
                <Shape
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onDelete={() => deleteShape(item.id)}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  canvasScale={scale}
                />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

// ---------- Sidebar ----------

interface SidebarProps {
  tool: Tool;
  pencilColor: string;
  showColorPicker: boolean;
  showTableMenu: boolean;
  onPencilPress: () => void;
  onPickColor: (color: string) => void;
  onEraserPress: () => void;
  onTablesPress: () => void;
  onSelectSeater: (seater: SeaterType) => void;
  onImagePress: () => void;
  onClearPress: () => void;
  onCollapse: () => void;
}

function Sidebar({
  tool,
  pencilColor,
  showColorPicker,
  showTableMenu,
  onPencilPress,
  onPickColor,
  onEraserPress,
  onTablesPress,
  onSelectSeater,
  onImagePress,
  onClearPress,
  onCollapse,
}: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.collapseHeaderBtn} onPress={onCollapse}>
        <Text style={styles.collapseHeaderText}>◀️</Text>
      </Pressable>

      <View style={styles.relativeWrap}>
        <SidebarButton
          emoji="✏️"
          label="Pencil"
          active={tool === 'pencil'}
          onPress={onPencilPress}
        >
          <View style={[styles.colorDot, { backgroundColor: pencilColor }]} />
        </SidebarButton>

        {showColorPicker && (
          <Popover title="Brush Color">
            <View style={styles.colorRow}>
              {PENCIL_COLORS.map(color => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    pencilColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => onPickColor(color)}
                />
              ))}
            </View>
          </Popover>
        )}
      </View>

      <SidebarButton
        emoji="🧹"
        label="Eraser"
        active={tool === 'eraser'}
        onPress={onEraserPress}
      />

      <View style={styles.relativeWrap}>
        <SidebarButton
          emoji="🪑"
          label="Tables"
          active={tool === 'shapes'}
          onPress={onTablesPress}
        />

        {showTableMenu && (
          <Popover title="Add Table">
            <View style={styles.seaterGrid}>
              {SEATER_OPTIONS.map(seater => (
                <Pressable
                  key={seater}
                  style={styles.seaterOption}
                  onPress={() => onSelectSeater(seater)}
                >
                  <Text style={styles.seaterOptionText}>{seater}</Text>
                  <Text style={styles.seaterOptionSub}>Seater</Text>
                </Pressable>
              ))}
            </View>
          </Popover>
        )}
      </View>

      <SidebarButton emoji="🖼️" label="Image" onPress={onImagePress} />

      <Pressable style={styles.clearBtn} onPress={onClearPress}>
        <Text style={styles.clearEmoji}>🗑️</Text>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

function SidebarButton({
  emoji,
  label,
  active,
  onPress,
  children,
}: {
  emoji: string;
  label: string;
  active?: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={[styles.sidebarBtn, active && styles.sidebarBtnActive]} onPress={onPress}>
      <Text style={styles.sidebarEmoji}>{emoji}</Text>
      <Text style={styles.sidebarLabel}>{label}</Text>
      {children}
    </Pressable>
  );
}

function Popover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.popover}>
      <Text style={styles.popoverTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },

  sidebar: {
    width: sizes.sidebarWidth,
    backgroundColor: colors.sidebarBg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  collapseHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  collapseHeaderText: {
    fontSize: 16,
  },

  relativeWrap: { position: 'relative', zIndex: 100 },

  sidebarBtn: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sidebarBtnActive: { backgroundColor: colors.primary },
  sidebarEmoji: { fontSize: 20 },
  sidebarLabel: { fontSize: 9, color: colors.textOnDark, marginTop: 3, fontWeight: '600' },

  colorDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.sidebarBg,
  },

  clearBtn: {
    position: 'absolute',
    bottom: spacing.xl,
    width: 54,
    height: 54,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearEmoji: { fontSize: 18 },
  clearText: { fontSize: 9, color: colors.danger, marginTop: 2, fontWeight: '600' },

  popover: {
    position: 'absolute',
    left: sizes.sidebarWidth,
    top: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  popoverTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorOption: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorOptionSelected: { borderWidth: 2, borderColor: colors.primary },

  seaterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  seaterOption: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  seaterOptionText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  seaterOptionSub: { fontSize: 9, color: colors.textSecondary, fontWeight: '600' },

  canvas: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  floatingOpenBtn: {
    position: 'absolute',
    top: spacing.md + 20,
    left: spacing.md,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.sidebarBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingOpenText: {
    fontSize: 16,
  },
});