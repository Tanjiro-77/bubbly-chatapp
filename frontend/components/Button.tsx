import { StyleSheet, TouchableOpacity, View } from 'react-native';
import React from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { ButtonProps } from "../types";
import { colors, radius } from "../constants/theme";
import { verticalScale } from "../utils/styling";
import { hapticTap } from "../utils/haptics";
import Loading from "./Loading";

const Button = ({
    style,
    onPress,
    onPressIn,
    onPressOut,
    children,
    loading = false,
    disabled = false,
    activeOpacity = 0.88,
    haptic = "heavy",
    ...rest
}: ButtonProps) => {
    const pressScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }));

    if (loading) {
        return (
            <View style={[styles.button, style, styles.loadingState]}>
                <Loading size="small" color={colors.neutral900} />
            </View>
        );
    }

    const handlePress = () => {
        if (haptic !== false) {
            hapticTap(haptic);
        }
        onPress?.();
    };

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                onPress={handlePress}
                onPressIn={(e) => {
                    if (!disabled) {
                        pressScale.value = withSpring(0.968, { damping: 18, stiffness: 360 });
                    }
                    onPressIn?.(e);
                }}
                onPressOut={(e) => {
                    pressScale.value = withSpring(1, { damping: 16, stiffness: 320 });
                    onPressOut?.(e);
                }}
                disabled={disabled}
                activeOpacity={activeOpacity}
                style={[styles.button, style, disabled && styles.disabledState]}
                {...rest}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

export default React.memo(Button);

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        borderCurve: 'continuous',
        height: verticalScale(54),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    loadingState: {
        opacity: 0.85,
    },
    disabledState: {
        opacity: 0.5,
    },
});
