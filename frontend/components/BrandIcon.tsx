import React from "react";
import Svg, { Path } from "react-native-svg";
import Typo from "./Typo";

export interface SimpleIconData {
    title: string;
    hex: string;
    path: string;
}

interface BrandIconProps {
    /** Icon data object from `simple-icons` — pass undefined to force fallback */
    icon?: SimpleIconData;
    /** Emoji shown if the real logo isn't available */
    fallbackEmoji: string;
    size?: number;
    /** Force a solid color instead of the brand's official color (useful for monochrome logos like GitHub in dark mode) */
    monochrome?: string;
}

const BrandIcon: React.FC<BrandIconProps> = ({
    icon,
    fallbackEmoji,
    size = 22,
    monochrome,
}) => {
    if (icon?.path) {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24">
                <Path d={icon.path} fill={monochrome ?? `#${icon.hex}`} />
            </Svg>
        );
    }

    return (
        <Typo size={size * 0.82} style={{ lineHeight: size + 2 }}>
            {fallbackEmoji}
        </Typo>
    );
};

export default BrandIcon;