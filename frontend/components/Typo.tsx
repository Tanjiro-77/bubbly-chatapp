import { Text, TextStyle } from 'react-native';
import React, { useMemo } from 'react';
import { colors } from "../constants/theme";
import { TypoProps } from "../types";
import { verticalScale } from "../utils/styling";

const Typo = ({
    size = 16,
    color = colors.text,
    fontWeight = '400',
    children,
    style,
    textProps = {},
}: TypoProps) => {
    const textStyle = useMemo<TextStyle>(() => ({
        fontSize: verticalScale(size),
        color,
        fontWeight,
    }), [size, color, fontWeight]);

    return (
        <Text maxFontSizeMultiplier={1.3} style={[textStyle, style]} {...textProps}>
            {children}
        </Text>
    );
};

export default React.memo(Typo);
