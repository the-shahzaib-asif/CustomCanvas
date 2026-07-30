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
import Svg, { Defs, Pattern, Rect, Circle, Path } from 'react-native-svg';

import Shape, { ShapeItem, SeaterType } from './components/CanvasElement';
import { colors, spacing, sizes, radius } from './theme';

const SEATER_OPTIONS: SeaterType[] = [2, 4, 6, 8, 12];

const MAX_ZOOM = sizes.canvasMaxZoom;
const PPF = sizes.pixelsPerFoot;

export default function App() {
  // ── Floor dimensions — set once via the setup screen, then fixed ──
  const [floorWidthFt, setFloorWidthFt] = useState<number | null>(null);
  const [floorHeightFt, setFloorHeightFt] = useState<number | null>(null);
  const [floorName, setFloorName] = useState<string>('Ground Floor');

  // Fallback dummy values so hooks below never see NaN before setup is done.
  // The setup screen is shown instead of the canvas until these are real.
  const CONTENT_W = (floorWidthFt ?? 30) * PPF;
  const CONTENT_H = (floorHeightFt ?? 20) * PPF;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewportWidth = windowWidth; // Occupy full screen, sidebar overlays on top
  const viewportHeight = windowHeight;

  // Calculate dynamic scale to fit the floor on screen
  const scaleX = viewportWidth / CONTENT_W;
  const scaleY = viewportHeight / CONTENT_H;
  const fitScale = Math.min(scaleX, scaleY) * 0.9; // 10% safety margin

  // Allow zoom out up to 0.1 or fitScale * 0.8 (whichever is smaller) for bird's eye view
  const dynamicMinZoom = Math.min(0.1, fitScale * 0.8);

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showTableMenu, setShowTableMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Sidebar slide offset
  const sidebarTranslateX = useSharedValue(0);

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

  const sidebarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarTranslateX.value }],
  }));

  const closeAllPopovers = () => {
    setShowTableMenu(false);
  };

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);
    sidebarTranslateX.value = withTiming(nextState ? 0 : -sizes.sidebarWidth, { duration: 250 });
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

  const bgPan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onChange(e => {
      const next = clampPan(panX.value + e.changeX, panY.value + e.changeY, scale.value);
      panX.value = next.x;
      panY.value = next.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  // Combine all gestures (1-finger pan, 2-finger pan, pinch, and rotation) into one root detector
  const parentGesture = Gesture.Simultaneous(parentPan, parentPinch, parentRotate, bgPan);

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
    setShowTableMenu(false);
  };

  const addImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
      if (response.didCancel || response.errorMessage) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        const newImage: ShapeItem = { id: Date.now().toString(), type: 'Image', imageUri: uri };
        setShapes(prev => [...prev, newImage]);
      }
    });
  };

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    setShapes([]);
    setSelectedId(null);
  };

  // ── Show setup screen until floor dimensions are chosen ──
  if (!floorWidthFt || !floorHeightFt) {
    return (
      <NewFloorSetup
        onCreate={(w, h, name) => {
          setFloorWidthFt(w);
          setFloorHeightFt(h);
          setFloorName(name);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View style={[styles.sidebarContainer, sidebarAnimStyle]}>
        <Sidebar
          showTableMenu={showTableMenu}
          onTablesPress={() => {
            setShowTableMenu(prev => !prev);
          }}
          onSelectSeater={addTable}
          onImagePress={addImage}
          onClearPress={clearCanvas}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
      </Animated.View>

      <View style={styles.canvasArea}>
        {/* Workspace Title Header — Displays floor details dynamically */}
        <View style={styles.workspaceHeader} pointerEvents="none">
          <Text style={styles.workspaceTitle}>{floorName}</Text>
          <Text style={styles.workspaceSubtitle}>
            {floorWidthFt}ft × {floorHeightFt}ft Layout
          </Text>
        </View>

        <GestureDetector gesture={parentGesture}>
          <View style={StyleSheet.absoluteFill}>
            {/* Viewport-wide background tap target to deselect selected elements */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                setSelectedId(null);
                closeAllPopovers();
              }}
            />

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
              <View style={styles.floorSurface}>
                {/* SVG Dotted Grid Pattern (1 dot per foot) */}
                <Svg style={StyleSheet.absoluteFill}>
                  <Defs>
                    <Pattern
                      id="gridPattern"
                      width={40} // 40px matches 1 foot
                      height={40}
                      patternUnits="userSpaceOnUse"
                    >
                      <Circle cx={20} cy={20} r={1.5} fill={colors.gridDot} />
                    </Pattern>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#gridPattern)" />
                </Svg>
              </View>

              {/* Floor surface tap target to deselect elements */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setSelectedId(null);
                  closeAllPopovers();
                }}
              />

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

function NewFloorSetup({ onCreate }: { onCreate: (widthFt: number, heightFt: number, name: string) => void }) {
  const [name, setName] = useState('Ground Floor');
  const [width, setWidth] = useState('30');
  const [height, setHeight] = useState('20');
  
  const [errors, setErrors] = useState<{ name?: string; width?: string; height?: string }>({});

  const handleCreate = () => {
    const newErrors: typeof errors = {};

    // 1. Clean and validate Name
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Floor name is required';
    }

    // 2. Validate Width
    const wNum = Number(width);
    if (isNaN(wNum) || wNum <= 0) {
      newErrors.width = 'Must be a positive number';
    } else if (wNum < 10) {
      newErrors.width = 'Min width is 10ft';
    } else if (wNum > 150) {
      newErrors.width = 'Max width is 150ft';
    }

    // 3. Validate Height
    const hNum = Number(height);
    if (isNaN(hNum) || hNum <= 0) {
      newErrors.height = 'Must be a positive number';
    } else if (hNum < 10) {
      newErrors.height = 'Min height is 10ft';
    } else if (hNum > 150) {
      newErrors.height = 'Max height is 150ft';
    }

    // If there are validation errors, block submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validation success: send sanitized values
    onCreate(wNum, hNum, trimmedName);
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
          Enter details to design your restaurant table layout module.
        </Text>

        {/* Floor Name input field */}
        <View style={{ width: '100%', marginBottom: spacing.md }}>
          <Text style={styles.setupLabel}>Floor Name</Text>
          <TextInput
            style={[styles.setupInput, errors.name && styles.setupInputError]}
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Ground Floor"
            placeholderTextColor={colors.textMuted}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Width and Height input fields */}
        <View style={styles.setupRow}>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Width (ft)</Text>
            <TextInput
              style={[styles.setupInput, errors.width && styles.setupInputError]}
              value={width}
              onChangeText={(txt) => {
                // Strip negative signs and non-numeric characters immediately
                const sanitized = txt.replace(/[^0-9.]/g, '');
                setWidth(sanitized);
                setErrors((prev) => ({ ...prev, width: undefined }));
              }}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
            />
            {errors.width && <Text style={styles.errorText}>{errors.width}</Text>}
          </View>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Height (ft)</Text>
            <TextInput
              style={[styles.setupInput, errors.height && styles.setupInputError]}
              value={height}
              onChangeText={(txt) => {
                const sanitized = txt.replace(/[^0-9.]/g, '');
                setHeight(sanitized);
                setErrors((prev) => ({ ...prev, height: undefined }));
              }}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.textMuted}
            />
            {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
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
  showTableMenu: boolean;
  onTablesPress: () => void;
  onSelectSeater: (seater: SeaterType) => void;
  onImagePress: () => void;
  onClearPress: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function Sidebar({
  showTableMenu,
  onTablesPress,
  onSelectSeater,
  onImagePress,
  onClearPress,
  isSidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      {/* Brand logo header — non-clickable, clearly branded */}
      <View style={styles.logoHeader}>
        <View style={styles.logoCircle}>
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={colors.primary} strokeWidth="2" />
            <Circle cx="12" cy="12" r="6" stroke={colors.primary} strokeWidth="1.2" strokeDasharray="3 2" />
            <Path d="M8 8V11M8 11V15M8 11H9V8M8 11H7V8" stroke={colors.primary} strokeWidth="1.2" strokeLinecap="round" />
            <Path d="M16 8V15M16 8C16 8 17 9 17 11C17 13 16 15 16 15" fill={colors.primary} stroke={colors.primary} strokeWidth="0.8" />
          </Svg>
        </View>
        <Text style={styles.logoTitle}>RTMS</Text>
      </View>

      {/* Tables Button */}
      <View style={styles.relativeWrap}>
        <SidebarButton
          icon={
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Rect x="4" y="8" width="16" height="10" rx="2" stroke={showTableMenu ? '#FFFFFF' : colors.textOnDark} strokeWidth="2" />
              <Circle cx="12" cy="5" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="12" cy="19" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="2" cy="13" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="22" cy="13" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
            </Svg>
          }
          label="Tables"
          active={showTableMenu}
          onPress={onTablesPress}
        />
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

      {/* Image Button */}
      <SidebarButton
        icon={
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="3" stroke={colors.textOnDark} strokeWidth="2" />
            <Circle cx="8.5" cy="8.5" r="1.5" fill={colors.textOnDark} />
            <Path d="M21 15L16 10L5 21" stroke={colors.textOnDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        }
        label="Image"
        onPress={onImagePress}
      />

      <View style={styles.sidebarSpacer} />

      {/* Clear Button */}
      <Pressable style={styles.clearBtn} onPress={onClearPress}>
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <Path d="M3 6H21" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" />
          <Path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6" stroke={colors.danger} strokeWidth="2" />
          <Path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke={colors.danger} strokeWidth="2" />
        </Svg>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>

      {/* Slide Handle (Toggle Button) */}
      <Pressable style={styles.toggleHandle} onPress={onToggleSidebar}>
        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          {isSidebarOpen ? (
            <Path d="M15 19L8 12L15 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <Path d="M9 5L16 12L9 19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

function SidebarButton({
  icon,
  label,
  active,
  onPress,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={[styles.sidebarBtn, active && styles.sidebarBtnActive]} onPress={onPress}>
      {icon}
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

  // ── Sidebar Container & Sidebar ──
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: sizes.sidebarWidth,
    zIndex: 2000,
  },
  sidebar: {
    flex: 1,
    backgroundColor: colors.sidebarBg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.borderDark,
  },
  logoHeader: {
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: spacing.sm,
    width: '100%',
  },
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(240, 89, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoTitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
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
  sidebarLabel: { fontSize: 9, color: colors.textOnDark, marginTop: 4, fontWeight: '600' },

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
  clearText: { fontSize: 9, color: colors.danger, marginTop: 4, fontWeight: '600' },

  toggleHandle: {
    position: 'absolute',
    right: -16,
    top: '50%',
    marginTop: -20,
    width: 16,
    height: 40,
    backgroundColor: colors.sidebarBg,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

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
    overflow: 'hidden',             // Ensure grid dots don't leak out of rounded corners
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
  workspaceHeader: {
    position: 'absolute',
    top: spacing.lg,
    left: sizes.sidebarWidth + spacing.lg, // next to the sidebar
    zIndex: 1000,
    backgroundColor: 'rgba(26, 29, 41, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  workspaceTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  workspaceSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  setupInputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});