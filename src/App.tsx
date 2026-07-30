// App.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';

import Shape, { ShapeItem, SeaterType } from './components/CanvasElement';
import DrawingCanvas, { DrawingPath } from './components/DrawingCanvas';
import { colors, spacing, sizes, radius } from './theme';

const PENCIL_COLORS = ['#111827', colors.primary, '#10B981', '#3B82F6', '#EC4899', '#F59E0B'];
const SEATER_OPTIONS: SeaterType[] = [2, 4, 6, 8, 12];

type Tool = 'shapes' | 'pencil' | 'eraser';

const MAX_ZOOM = sizes.canvasMaxZoom;
const PPF = sizes.pixelsPerFoot;

export default function App() {
  // ── Floor dimensions — set once via the setup screen, then fixed ──
  const [floorWidthFt, setFloorWidthFt] = useState<number | null>(null);
  const [floorHeightFt, setFloorHeightFt] = useState<number | null>(null);

  // Fallback dummy values so hooks below never see NaN before setup is done.
  // The setup screen is shown instead of the canvas until these are real.
  const CONTENT_W = (floorWidthFt ?? 30) * PPF;
  const CONTENT_H = (floorHeightFt ?? 20) * PPF;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewportWidth = windowWidth - sizes.sidebarWidth;
  const viewportHeight = windowHeight;

  // Calculate dynamic scale to fit the floor on screen
  const scaleX = viewportWidth / CONTENT_W;
  const scaleY = viewportHeight / CONTENT_H;
  const fitScale = Math.min(scaleX, scaleY) * 0.9; // 10% safety margin

  // Allow zoom out up to 0.1 or fitScale * 0.8 (whichever is smaller) for bird's eye view
  const dynamicMinZoom = Math.min(0.1, fitScale * 0.8);

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('shapes');

  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [pencilColor, setPencilColor] = useState(PENCIL_COLORS[1]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [lastPencilPress, setLastPencilPress] = useState(0);

  const [zoomPercent, setZoomPercent] = useState(100);

  // ── Canvas pan, zoom & rotation shared values ──
  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const canvasRotation = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const savedCanvasRotation = useSharedValue(0);

  useAnimatedReaction(
    () => Math.round(scale.value * 100),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setZoomPercent)(current);
      }
    },
  );

  // Camera pan clamp: allows a soft overscroll past the floor's edge
  // (Miro-style) instead of a hard wall, but never infinite.
  const clampPan = (px: number, py: number, s: number) => {
    'worklet';
    const scaledW = CONTENT_W * s;
    const scaledH = CONTENT_H * s;
    const buffer = sizes.panOverscroll;

    const maxPanX = Math.max(0, (scaledW - viewportWidth) / 2) + buffer;
    const maxPanY = Math.max(0, (scaledH - viewportHeight) / 2) + buffer;

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  };

  const canvasAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
      { rotate: `${canvasRotation.value}rad` },
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

  // ── Gestures ──

  const parentPan = Gesture.Pan()
    .minPointers(2)
    .onChange(e => {
      const next = clampPan(panX.value + e.changeX, panY.value + e.changeY, scale.value);
      panX.value = next.x;
      panY.value = next.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  const parentPinch = Gesture.Pinch()
    .onChange(e => {
      // Use dynamicMinZoom so users can zoom out to bird's eye view
      const next = Math.min(MAX_ZOOM, Math.max(dynamicMinZoom, scale.value * e.scaleChange));
      scale.value = next;
      const clamped = clampPan(panX.value, panY.value, next);
      panX.value = clamped.x;
      panY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Two-finger twist rotates the whole floor — a viewing aid, not a
  // structural change. Reset button always brings it back to 0°.
  const parentRotate = Gesture.Rotation()
    .onUpdate(e => {
      canvasRotation.value = savedCanvasRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedCanvasRotation.value = canvasRotation.value;
    });

  const parentGesture = Gesture.Simultaneous(parentPan, parentPinch, parentRotate);

  const bgPan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .enabled(tool === 'shapes')
    .onChange(e => {
      const next = clampPan(panX.value + e.changeX, panY.value + e.changeY, scale.value);
      panX.value = next.x;
      panY.value = next.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  // ── Zoom bar handlers ──
  const zoomBy = (factor: number) => {
    // Use dynamicMinZoom to clamp zoom out button action
    const next = Math.min(MAX_ZOOM, Math.max(dynamicMinZoom, scale.value * factor));
    scale.value = withTiming(next, { duration: 150 });
    savedScale.value = next;
    const clamped = clampPan(panX.value, panY.value, next);
    panX.value = withTiming(clamped.x, { duration: 150 });
    panY.value = withTiming(clamped.y, { duration: 150 });
    savedPanX.value = clamped.x;
    savedPanY.value = clamped.y;
  };

  const resetView = () => {
    scale.value = withTiming(1, { duration: 200 });
    panX.value = withTiming(0, { duration: 200 });
    panY.value = withTiming(0, { duration: 200 });
    canvasRotation.value = withTiming(0, { duration: 200 });
    savedScale.value = 1;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedCanvasRotation.value = 0;
  };

  // Fits the whole floor inside the visible viewport in one tap —
  // computes the largest zoom level that shows the entire floor at once.
  const fitToScreen = () => {
    // Use pre-calculated fitScale and dynamicMinZoom
    const clampedFitScale = Math.max(dynamicMinZoom, Math.min(fitScale, MAX_ZOOM));

    scale.value = withTiming(clampedFitScale, { duration: 250 });
    panX.value = withTiming(0, { duration: 250 });
    panY.value = withTiming(0, { duration: 250 });
    canvasRotation.value = withTiming(0, { duration: 250 });

    savedScale.value = clampedFitScale;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedCanvasRotation.value = 0;
  };

  // Auto-fit once the floor is created, so the user immediately sees
  // the whole thing instead of a zoomed-in corner.
  useEffect(() => {
    if (floorWidthFt && floorHeightFt) {
      fitToScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorWidthFt, floorHeightFt]);

  const addTable = (seaterType: SeaterType) => {
    const tableCount = shapes.filter(s => s.type === 'table').length + 1;
    const newTable: ShapeItem = {
      id: Date.now().toString(),
      type: 'table',
      seaterType,
      tableNumber: `T${tableCount}`,
    };
    setShapes(prev => [...prev, newTable]);
    setSelectedId(newTable.id);
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

  // ── Show setup screen until floor dimensions are chosen ──
  if (!floorWidthFt || !floorHeightFt) {
    return (
      <NewFloorSetup
        onCreate={(w, h) => {
          setFloorWidthFt(w);
          setFloorHeightFt(h);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
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
      />

      <View style={styles.canvasArea}>
        {/* Viewport-wide background for 1-finger panning/deselecting on the gray area */}
        <GestureDetector gesture={bgPan}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setSelectedId(null);
              closeAllPopovers();
            }}
          />
        </GestureDetector>

        <GestureDetector gesture={parentGesture}>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: CONTENT_W,
                  height: CONTENT_H,
                  left: '50%',
                  top: '50%',
                  marginLeft: -CONTENT_W / 2,
                  marginTop: -CONTENT_H / 2,
                },
                canvasAnimStyle,
              ]}
            >
              <View style={styles.floorSurface} />

              {/* Floor-specific background for 1-finger panning/deselecting on the empty floor area */}
              <GestureDetector gesture={bgPan}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    setSelectedId(null);
                    closeAllPopovers();
                  }}
                />
              </GestureDetector>

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

              {shapes.map(item => (
                <Shape
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onDelete={() => deleteShape(item.id)}
                  canvasWidth={CONTENT_W}
                  canvasHeight={CONTENT_H}
                  canvasScale={scale} // Pass the scale so elements move at the right speed when zoomed
                />
              ))}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Floating zoom control bar */}
        <View style={styles.zoomBar}>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(0.85)}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Pressable onPress={resetView} style={styles.zoomLabelWrap}>
            <Text style={styles.zoomLabelText}>{zoomPercent}%</Text>
          </Pressable>
          <Pressable style={styles.zoomBtn} onPress={() => zoomBy(1 / 0.85)}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable style={styles.zoomBtn} onPress={fitToScreen}>
            <Text style={styles.zoomBtnTextSmall}>⛶</Text>
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

// ---------- New Floor Setup Screen ----------

function NewFloorSetup({ onCreate }: { onCreate: (widthFt: number, heightFt: number) => void }) {
  const [width, setWidth] = useState('30');
  const [height, setHeight] = useState('20');

  const handleCreate = () => {
    const w = Math.max(5, Number(width) || 30);
    const h = Math.max(5, Number(height) || 20);
    onCreate(w, h);
  };

  return (
    <KeyboardAvoidingView
      style={styles.setupContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.setupCard}>
        <Text style={styles.setupEmoji}>🍽️</Text>
        <Text style={styles.setupTitle}>Create Your Floor</Text>
        <Text style={styles.setupSubtitle}>
          Enter the real-world size of your restaurant floor (in feet). You can place tables and design the layout next.
        </Text>

        <View style={styles.setupRow}>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Width (ft)</Text>
            <TextInput
              style={styles.setupInput}
              value={width}
              onChangeText={setWidth}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Height (ft)</Text>
            <TextInput
              style={styles.setupInput}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Pressable style={styles.setupButton} onPress={handleCreate}>
          <Text style={styles.setupButtonText}>Create Floor</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
}: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.logoWrap}>
        <Text style={styles.logoText}>🍽️</Text>
      </View>

      <View style={styles.relativeWrap}>
        <SidebarButton emoji="🪑" label="Tables" active={tool === 'shapes'} onPress={onTablesPress} />
        {showTableMenu && (
          <Popover title="Add Table">
            <View style={styles.seaterGrid}>
              {SEATER_OPTIONS.map(seater => (
                <Pressable key={seater} style={styles.seaterOption} onPress={() => onSelectSeater(seater)}>
                  <Text style={styles.seaterOptionText}>{seater}</Text>
                  <Text style={styles.seaterOptionSub}>Seater</Text>
                </Pressable>
              ))}
            </View>
          </Popover>
        )}
      </View>

      <View style={styles.relativeWrap}>
        <SidebarButton emoji="✏️" label="Pencil" active={tool === 'pencil'} onPress={onPencilPress}>
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

      <SidebarButton emoji="🧹" label="Eraser" active={tool === 'eraser'} onPress={onEraserPress} />
      <SidebarButton emoji="🖼️" label="Image" onPress={onImagePress} />

      <View style={styles.sidebarSpacer} />

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

  // ── Setup screen ──
  setupContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  setupCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  setupEmoji: { fontSize: 40, marginBottom: spacing.sm },
  setupTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  setupSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  setupRow: { flexDirection: 'row', gap: spacing.md, width: '100%', marginBottom: spacing.lg },
  setupField: { flex: 1 },
  setupLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  setupInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  setupButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  setupButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Sidebar ──
  sidebar: {
    width: sizes.sidebarWidth,
    backgroundColor: colors.sidebarBg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  logoWrap: { marginBottom: spacing.md },
  logoText: { fontSize: 24 },
  sidebarSpacer: { flex: 1 },

  relativeWrap: { position: 'relative', zIndex: 100 },

  sidebarBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sidebarBtnActive: { backgroundColor: colors.primary },
  sidebarEmoji: { fontSize: 19 },
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
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearEmoji: { fontSize: 17 },
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
  popoverTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorOption: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border },
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

  // ── Canvas ──
  canvasArea: {
    flex: 1,
    backgroundColor: colors.workspaceBg,
    overflow: 'hidden',
  },
  floorSurface: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,               // CHANGED — thicker border
    borderColor: colors.borderDark, // CHANGED — darker border, zyada defined edge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },   // CHANGED — bigger shadow
    shadowOpacity: 0.25,                      // CHANGED
    shadowRadius: 20,                          // CHANGED
    elevation: 12,
  },

  // ── Zoom bar ──
  zoomBar: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sidebarBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: { color: colors.textOnDark, fontSize: 18, fontWeight: '600', marginTop: -2 },
  zoomBtnTextSmall: { color: colors.textOnDark, fontSize: 14, fontWeight: '600' },
  zoomLabelWrap: { paddingHorizontal: spacing.md },
  zoomLabelText: { color: colors.textOnDark, fontSize: 13, fontWeight: '700' },
  zoomDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.xs,
  },
});