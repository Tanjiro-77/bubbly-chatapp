import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BubblyAlert } from "../../components/BubblyAlert";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import MaterialIcons from "@react-native-vector-icons/material-icons";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import Typo from "../../components/Typo";
import { useAuth } from "../../contexts/authContext";
import { submitUserBugReport, getDeviceDiagnostics } from "../../services/errorReporter";
import { scale, verticalScale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";

type CategoryType = "crash" | "ui_glitch" | "network" | "audio_call" | "other";

const CATEGORIES: { label: string; value: CategoryType; icon: string }[] = [
    { label: "Bug / Crash", value: "crash", icon: "bug-report" },
    { label: "UI Glitch", value: "ui_glitch", icon: "palette" },
    { label: "Network", value: "network", icon: "wifi-off" },
    { label: "Call / Audio", value: "audio_call", icon: "call" },
    { label: "Other", value: "other", icon: "help-outline" },
];

export default function ReportBugModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<CategoryType>("crash");
    const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const diagnostics = getDeviceDiagnostics();

    const handlePickScreenshot = async () => {
        hapticTap("medium");
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                hapticTap("warning");
                BubblyAlert.alert(
                    "Permission Required",
                    "Please allow photo library access to attach a screenshot of the issue."
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                hapticTap("success");
                setScreenshotUri(result.assets[0].uri);
            }
        } catch (err) {
            hapticTap("error");
            console.error("Failed to pick screenshot:", err);
            BubblyAlert.alert("Error", "Could not open image picker.");
        }
    };

    const handleRemoveScreenshot = () => {
        hapticTap("warning");
        setScreenshotUri(null);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            hapticTap("error");
            BubblyAlert.alert("Missing Title", "Please enter a brief title or summary of the issue.");
            return;
        }

        if (!description.trim()) {
            hapticTap("error");
            BubblyAlert.alert("Missing Details", "Please provide a short description of what happened.");
            return;
        }

        hapticTap("heavy");
        setIsSubmitting(true);

        try {
            const result = await submitUserBugReport({
                title: title.trim(),
                description: description.trim(),
                category,
                imageUri: screenshotUri,
                currentRoute: diagnostics.currentRoute || "/settings",
                userId: (user as any)?._id || (user as any)?.id,
                userName: (user as any)?.name,
                userEmail: (user as any)?.email,
            });

            if (result.success) {
                hapticTap("celebration");
                BubblyAlert.alert(
                    "Report Sent! 🚀",
                    "Thank you for reporting this issue. Our team has received the diagnostic details and will investigate.",
                    [{ text: "OK", onPress: () => { if (router.canGoBack()) router.back(); else router.replace("/(main)/home"); } }]
                );
            } else {
                hapticTap("error");
                BubblyAlert.alert("Submission Notice", result.msg || "Could not submit report. Please try again.");
            }
        } catch (err: any) {
            hapticTap("error");
            BubblyAlert.alert("Error", err.message || "Failed to submit report.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
        >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, spacingY._15) + spacingY._5 }]}>
                <Typo size={18} fontWeight="700" color={colors.neutral900} style={{ flex: 1 }}>
                    Report an Issue
                </Typo>
                <TouchableOpacity
                    onPress={() => {
                        hapticTap("light");
                        if (router.canGoBack()) router.back();
                        else router.replace("/(main)/home");
                    }}
                    style={styles.closeBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MaterialIcons name="close" size={24} color={colors.neutral600} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, spacingY._25) + spacingY._15 }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Intro notice */}
                <View style={styles.infoBanner}>
                    <MaterialIcons name="info" size={20} color="#208AEF" style={styles.infoIcon} />
                    <Typo size={13} color={colors.neutral700} style={styles.infoText}>
                        Tell us what happened. Diagnostics about your device and OS will be automatically attached to help fix the issue quickly.
                    </Typo>
                </View>

                {/* Category Selection */}
                <Typo size={14} fontWeight="600" color={colors.neutral800} style={styles.fieldLabel}>
                    Issue Category
                </Typo>
                <View style={styles.categoryRow}>
                    {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.value;
                        return (
                            <TouchableOpacity
                                key={cat.value}
                                style={[
                                    styles.categoryChip,
                                    isSelected && styles.categoryChipSelected,
                                ]}
                                onPress={() => {
                                    hapticTap("medium");
                                    setCategory(cat.value);
                                }}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons
                                    name={cat.icon as any}
                                    size={16}
                                    color={isSelected ? "#FFFFFF" : colors.neutral700}
                                />
                                <Text
                                    style={[
                                        styles.categoryText,
                                        isSelected && styles.categoryTextSelected,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Title Input */}
                <Typo size={14} fontWeight="600" color={colors.neutral800} style={styles.fieldLabel}>
                    Issue Title *
                </Typo>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Chat screen crashes when sending image"
                    placeholderTextColor={colors.neutral400}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={150}
                />

                {/* Description Input */}
                <Typo size={14} fontWeight="600" color={colors.neutral800} style={styles.fieldLabel}>
                    Description *
                </Typo>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what you were doing, what error or behavior occurred, and how to reproduce it..."
                    placeholderTextColor={colors.neutral400}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={2000}
                />

                {/* Screenshot Attachment */}
                <Typo size={14} fontWeight="600" color={colors.neutral800} style={styles.fieldLabel}>
                    Screenshot (Optional)
                </Typo>
                {screenshotUri ? (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: screenshotUri }} style={styles.imagePreview} />
                        <TouchableOpacity
                            style={styles.removeImageBtn}
                            onPress={handleRemoveScreenshot}
                        >
                            <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                            <Text style={styles.removeImageText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={handlePickScreenshot}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="add-photo-alternate" size={24} color="#208AEF" />
                        <Typo size={14} fontWeight="600" color="#208AEF" style={{ marginLeft: 8 }}>
                            Attach Screenshot
                        </Typo>
                    </TouchableOpacity>
                )}

                {/* Diagnostic snapshot preview */}
                <View style={styles.diagnosticsBox}>
                    <Typo size={12} fontWeight="600" color={colors.neutral500} style={{ marginBottom: 6 }}>
                        AUTOMATICALLY ATTACHED TELEMETRY
                    </Typo>
                    <Text style={styles.diagText}>📱 Device: {diagnostics.deviceModel}</Text>
                    <Text style={styles.diagText}>⚙️ OS: {diagnostics.os}</Text>
                    <Text style={styles.diagText}>📦 App Version: v{diagnostics.appVersion}</Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.neutral900} size="small" />
                    ) : (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <MaterialIcons name="send" size={18} color={colors.neutral900} style={{ marginRight: 8 }} />
                            <Text style={styles.submitButtonText}>Submit Error Report</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._17,
        paddingBottom: spacingY._12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    closeBtn: {
        padding: 4,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._35,
    },
    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderRadius: radius._12,
        padding: 12,
        marginBottom: spacingY._20,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    infoIcon: {
        marginRight: 10,
    },
    infoText: {
        flex: 1,
        lineHeight: 18,
    },
    fieldLabel: {
        marginBottom: 8,
        marginTop: 12,
    },
    categoryRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    categoryChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius._12,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    categoryChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primaryDark,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: "500",
        color: colors.neutral700,
        marginLeft: 6,
    },
    categoryTextSelected: {
        color: colors.neutral900,
        fontWeight: "700",
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: radius._12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.neutral900,
    },
    textArea: {
        minHeight: 110,
    },
    attachButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: radius._12,
        borderWidth: 1.5,
        borderColor: "#93C5FD",
        borderStyle: "dashed",
        backgroundColor: "#F0F7FF",
    },
    imagePreviewContainer: {
        borderRadius: radius._12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#000",
    },
    imagePreview: {
        width: "100%",
        height: 180,
        resizeMode: "cover",
    },
    removeImageBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(239, 68, 68, 0.9)",
        paddingVertical: 8,
    },
    removeImageText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 13,
        marginLeft: 6,
    },
    diagnosticsBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: radius._12,
        padding: 12,
        marginTop: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    diagText: {
        fontSize: 12,
        color: colors.neutral600,
        marginBottom: 3,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        paddingVertical: 15,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: colors.neutral900,
        fontSize: 16,
        fontWeight: "700",
    },
});
