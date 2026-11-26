import { StyleSheet, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { ButtonProps } from "../types"
import { colors, radius } from "../constants/theme"
import { verticalScale } from "../utils/styling"
import Loading from "./Loading"

const Button = ({
    style,
    onPress,
    children,
    loading = false,
    disabled = false,
    activeOpacity = 0.82,
    ...rest
}: ButtonProps) => {

    if (loading) {
        return (
            <View style={[styles.button, style, styles.loadingState]}>
                <Loading size="small" color={colors.neutral900} />
            </View>
        )
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={activeOpacity}
            style={[styles.button, style, disabled && styles.disabledState]}
            {...rest}
        >
            {children}
        </TouchableOpacity>
    )
}

export default Button

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
})