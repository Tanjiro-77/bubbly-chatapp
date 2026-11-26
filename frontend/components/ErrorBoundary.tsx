import React, { Component, ErrorInfo, ReactNode } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

            return (
                <SafeAreaView style={styles.container}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>⚠️</Text>
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We've encountered an unexpected problem. An error report has been automatically captured and sent to the developer so it can be fixed.
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
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
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
        backgroundColor: "#FEE2E2",
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
        color: "#0F172A",
        marginBottom: 10,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 12,
    },
    errorBox: {
        width: "100%",
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    errorLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 4,
    },
    errorMessage: {
        fontSize: 12,
        color: "#EF4444",
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    retryButton: {
        width: "100%",
        backgroundColor: "#f59e0b",
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
