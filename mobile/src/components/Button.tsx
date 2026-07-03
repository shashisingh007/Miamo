// Miamo Mobile — Button.
// Ported from services/web/src/components/ui/button.tsx. RN version uses
// Pressable + StyleSheet. Six variants (default/secondary/ghost/outline/
// danger/link) and four sizes (sm/default/lg/xl). Supports a `loading` prop
// that renders an ActivityIndicator and disables interaction.
import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type GestureResponderEvent,
} from 'react-native';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'link';
export type ButtonSize = 'sm' | 'default' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const ROSE = '#e85d75';
const ROSE_DARK = '#c74a63';

export function Button({
  onPress,
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  fullWidth,
  children,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const v = variant === 'primary' ? 'default' : variant;
  const s = size === 'md' ? 'default' : size;
  const isDisabled = disabled || loading;

  const variantStyle = variantStyles[v] || variantStyles.default;
  const sizeStyle = sizeStyles[s] || sizeStyles.default;
  const variantTextStyle = variantTextStyles[v] || variantTextStyles.default;
  const sizeTextStyle = sizeTextStyles[s] || sizeTextStyles.default;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variantStyle,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={v === 'secondary' || v === 'ghost' || v === 'outline' || v === 'link' ? ROSE : '#fff'}
            style={styles.spinner}
          />
        ) : null}
        {typeof children === 'string' ? (
          <Text style={[styles.text, sizeTextStyle, variantTextStyle, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

const variantStyles: Record<string, ViewStyle> = {
  default: {
    backgroundColor: ROSE,
  },
  secondary: {
    backgroundColor: 'rgba(232,93,117,0.10)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: ROSE,
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: undefined as unknown as number,
  },
};

const variantTextStyles: Record<string, TextStyle> = {
  default: { color: '#fff' },
  secondary: { color: ROSE_DARK },
  ghost: { color: ROSE },
  outline: { color: ROSE },
  danger: { color: '#fff' },
  link: { color: ROSE, textDecorationLine: 'underline' },
};

const sizeStyles: Record<string, ViewStyle> = {
  sm: { height: 36, paddingHorizontal: 12, borderRadius: 12 },
  default: { height: 44, paddingHorizontal: 20, borderRadius: 14 },
  lg: { height: 48, paddingHorizontal: 24, borderRadius: 14 },
  xl: { height: 56, paddingHorizontal: 28, borderRadius: 16 },
};

const sizeTextStyles: Record<string, TextStyle> = {
  sm: { fontSize: 12 },
  default: { fontSize: 14 },
  lg: { fontSize: 15 },
  xl: { fontSize: 16 },
};

export default Button;
