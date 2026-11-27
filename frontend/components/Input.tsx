import { Platform, StyleSheet, TextInput, View } from 'react-native';
import React, { useState } from 'react';
import { InputProps } from "../types";
import { colors, radius, spacingX } from "../constants/theme";
import { verticalScale } from "../utils/styling";

const Input = (props: InputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const {
        icon,
        rightIcon,
        containerStyle,
        inputStyle,
        inputRef,
        onFocus,
        onBlur,
        editable = true,
        ...rest
    } = props;

    return (
        <View
            style={[
                styles.container,
                editable === false && styles.disabledContainer,
                containerStyle,
                isFocused && styles.primaryBorder,
            ]}
        >
            {icon && <View style={styles.accessory}>{icon}</View>}

            <TextInput
                style={[
                    styles.input,
                    rest.multiline && styles.multilineInput,
                    inputStyle,
                ]}
                placeholderTextColor={colors.neutral400}
                selectionColor={colors.primaryDark}
                ref={inputRef}
                editable={editable}
                onFocus={(e) => {
                    setIsFocused(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    onBlur?.(e);
                }}
                {...rest}
            />

            {rightIcon && <View style={styles.accessory}>{rightIcon}</View>}
        </View>
    );
};

export default Input;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        minHeight: verticalScale(54),
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: colors.neutral200,
        borderRadius: radius.full,
        borderCurve: 'continuous',
        paddingHorizontal: spacingX._15,
        backgroundColor: colors.neutral100,
        gap: spacingX._10,
    },
    disabledContainer: {
        opacity: 0.72,
    },
    primaryBorder: {
        borderColor: colors.primary,
        backgroundColor: colors.white,
    },
    accessory: {
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        flex: 1,
        minWidth: 0,
        color: colors.text,
        fontSize: verticalScale(14.5),
        paddingVertical: 0,
    },
    multilineInput: {
        minHeight: verticalScale(24),
        paddingVertical: Platform.OS === "android" ? verticalScale(2) : 0,
        textAlignVertical: "center",
    },
});
