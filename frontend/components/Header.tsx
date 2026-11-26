import { StyleSheet, View } from 'react-native'
import React from 'react'
import { HeaderProps } from "../types"
import Typo from "./Typo"
import { spacingX } from "../constants/theme"
import { verticalScale } from "../utils/styling"

const Header = ({ title = "", leftIcon, rightIcon, style }: HeaderProps) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.sideSlot}>{leftIcon}</View>

            {title ? (
                <View style={styles.titleWrap}>
                    <Typo
                        size={20}
                        fontWeight="700"
                        style={styles.title}
                        textProps={{ numberOfLines: 1, ellipsizeMode: "tail" }}
                    >
                        {title}
                    </Typo>
                </View>
            ) : (
                <View style={styles.titleWrap} />
            )}

            <View style={[styles.sideSlot, styles.rightSlot]}>{rightIcon}</View>
        </View>
    )
}

export default Header

const styles = StyleSheet.create({
    container: {
        width: "100%",
        minHeight: verticalScale(44),
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: spacingX._8,
    },
    sideSlot: {
        minWidth: verticalScale(36),
        alignItems: "flex-start",
        justifyContent: "center",
        flexShrink: 0,
    },
    rightSlot: {
        alignItems: "flex-end",
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        textAlign: "center",
    },
});
