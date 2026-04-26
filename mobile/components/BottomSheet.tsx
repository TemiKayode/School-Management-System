import React, { useEffect, useRef } from 'react';
import {
  Animated, Modal, PanResponder, StyleSheet,
  TouchableWithoutFeedback, View, Dimensions,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapHeight?: number;
}

export function BottomSheet({ visible, onClose, children, snapHeight = SCREEN_H * 0.5 }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(snapHeight)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : snapHeight,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, snapHeight, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > snapHeight * 0.35 || g.vy > 0.8) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: translateY.interpolate({ inputRange: [0, snapHeight], outputRange: [1, 0] }) }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { height: snapHeight, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 16,
  },
});
