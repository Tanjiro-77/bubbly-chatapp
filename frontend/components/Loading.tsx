import { ActivityIndicator, ActivityIndicatorProps } from 'react-native'
import React from 'react'
import { colors } from "../constants/theme"

const Loading = ({
    size = 'large',
    color = colors.primaryDark
}: ActivityIndicatorProps) => {
    return (
        <ActivityIndicator
            size={size}
            color={color}
        />
    )
}

export default Loading