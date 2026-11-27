import React, { Component, ErrorInfo, ReactNode } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from "react-native";
import { captureAppException } from "../services/errorReporter";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // Automatically report to Sentry and Backend
        captureAppException(error, {
            message: `React Component Crash: ${error.message}`,
            isFatal: false,
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Deliberately avoid react-native-safe-area-context here so the boundary
            // never crashes if SafeAreaProvider is unavailable or failed upstream.
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>⚠️</Text>
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            Bubbly caught an unexpected error safely and sent a diagnostic report. Tap Try Again to continue.
                        </Text>

                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorLabel}>Diagnostic Details:</Text>
                                <Text style={styles.errorMessage} numberOfLines={4}>
                                    {this.state.error.toString()}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={this.handleReset}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0c0a09",
        paddingTop: Platform.OS === "ios" ? 54 : 34,
        paddingBottom: Platform.OS === "ios" ? 32 : 20,
    },
    content: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(250, 204, 21, 0.14)",
        borderWidth: 1,
        borderColor: "rgba(250, 204, 21, 0.35)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    icon: {
        fontSize: 36,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fafaf9",
        marginBottom: 10,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#a8a29e",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 12,
    },
    errorBox: {
        width: "100%",
        backgroundColor: "#1c1917",
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#292524",
    },
    errorLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#a8a29e",
        marginBottom: 4,
    },
    errorMessage: {
        fontSize: 12,
        color: "#f87171",
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    retryButton: {
        width: "100%",
        backgroundColor: "#facc15",
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: "center",
        shadowColor: "#d97706",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    retryButtonText: {
        color: "#1c1917",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default AppErrorBoundary;
