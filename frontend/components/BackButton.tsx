import { StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import { colors, radius } from "../constants/theme"
import { BackButtonProps } from "../types"
import { useRouter } from "expo-router"
import { CaretLeft } from 'phosphor-react-native'
import { verticalScale } from "../utils/styling"

const BackButton = ({
    style,
    iconSize = 24,
    color = colors.white
}: BackButtonProps) => {

    const router = useRouter();
    return (
        <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(main)/home"))}
            style={[styles.button, style]}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <CaretLeft size={verticalScale(iconSize)} color={color} weight="bold" />
        </TouchableOpacity>
    )
}

export default BackButton

const styles = StyleSheet.create({
    button: {
        minWidth: verticalScale(36),
        minHeight: verticalScale(36),
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
});
