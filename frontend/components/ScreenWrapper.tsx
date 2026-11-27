import {
    ImageBackground,
    Platform,
    StatusBar,
    View,
    useWindowDimensions,
} from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapperProps } from "../types";
import { colors } from "../constants/theme";

const isLightBackground = (bg?: string): boolean => {
    if (!bg) return false;
    const lower = bg.trim().toLowerCase();
    return (
        lower === "#fff" ||
        lower === "#ffffff" ||
        lower === "#fafaf9" ||
        lower === "#f5f5f4" ||
        lower === "#fffbeb" ||
        lower === "#f8fafc" ||
        lower === colors.white.toLowerCase() ||
        lower === colors.neutral50.toLowerCase() ||
        lower === colors.neutral100.toLowerCase()
    );
};

const ScreenWrapper = ({
    style,
    children,
    showPattern = false,
    isModal = false,
    bgOpacity = 1,
    backgroundColor,
    statusBarStyle,
}: ScreenWrapperProps) => {

    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();

    const flattenedBg =
        backgroundColor ||
        (style && typeof (style as any).backgroundColor === "string"
            ? (style as any).backgroundColor
            : undefined);

    const outerBackground = flattenedBg || (isModal ? colors.white : colors.neutral900);
    const barStyle =
        statusBarStyle ||
        (isModal || isLightBackground(outerBackground) ? "dark-content" : "light-content");

    let paddingTop = Math.max(insets.top, Platform.OS === "ios" ? 44 : 24);
    let paddingBottom = insets.bottom;

    if (isModal) {
        paddingTop = Platform.OS === "ios" ? Math.max(insets.top * 0.4, 14) : Math.max(insets.top, 18);
        paddingBottom = Math.max(insets.bottom, height * 0.015);
    }

    const innerContent = (
        <View
            style={[
                {
                    paddingTop,
                    paddingBottom,
                    flex: 1,
                },
                style,
            ]}
        >
            <StatusBar
                barStyle={barStyle}
                backgroundColor="transparent"
                translucent
            />
            {children}
        </View>
    );

    if (!showPattern) {
        return (
            <View style={{ flex: 1, backgroundColor: outerBackground }}>
                {innerContent}
            </View>
        );
    }

    return (
        <ImageBackground
            style={{
                flex: 1,
                backgroundColor: outerBackground,
            }}
            imageStyle={{ opacity: bgOpacity }}
            source={require('../assets/images/bgPattern.png')}
        >
            {innerContent}
        </ImageBackground>
    );
};

export default ScreenWrapper;
