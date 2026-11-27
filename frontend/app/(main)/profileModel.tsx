import {
    KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
    TouchableOpacity, View, Pressable,
} from 'react-native';
import { BubblyAlert } from "../../components/BubblyAlert";
import React, { useEffect, useState } from 'react';
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
import { hapticTap } from "../../utils/haptics";
import ScreenWrapper from "../../components/ScreenWrapper";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import * as Icons from "phosphor-react-native";
import Typo from "../../components/Typo";
import Input from "../../components/Input";
import { useAuth } from "../../contexts/authContext";
import { UserDataProps } from "../../types";
import Button from "../../components/Button";
import { useRouter } from "expo-router";
import { updateProfile, isSocketConnected } from "../../socket/socketEvents";
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from "../../services/imageService";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { InviteSheetModal } from "../../components/InviteSheetModal";
import {
    CustomStatusState,
    getMyCustomStatus,
    saveMyCustomStatus,
    STATUS_PRESETS,
} from "../../utils/featureStorage";

const ProfileModal = () => {
    const { user, signOut, updateToken, updateUserPhone } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const router = useRouter();

    const [userData, setUserData] = useState<UserDataProps>({
        name: "",
        email: "",
        avatar: null
    });
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
    const [statusEmoji, setStatusEmoji] = useState((user as any)?.customStatus?.emoji || "");
    const [statusText, setStatusText] = useState((user as any)?.customStatus?.text || "");

    useEffect(() => {
        getMyCustomStatus().then((st) => {
            if (st.text || st.emoji) {
                setStatusEmoji(st.emoji);
                setStatusText(st.text);
            }
        });
    }, []);

    useEffect(() => {
        updateProfile(processUpdateProfile);
        return () => { updateProfile(processUpdateProfile, true); };
    }, []);

    const processUpdateProfile = async (res: any) => {
        setLoading(false);
        if (res.success) {
            hapticTap("success");
            await updateToken(res.data.token);
            router.back();
        } else {
            hapticTap("error");
            BubblyAlert.alert('Profile Update', res.msg || 'Failed to update profile');
        }
    };

    useEffect(() => {
        setUserData({
            name: user?.name || "",
            email: user?.email || "",
            avatar: user?.avatar,
        });
        setPhoneNumber(user?.phoneNumber || "");
    }, [user]);

    const onPickImage = async () => {
        hapticTap("medium");
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                aspect: [1, 1],
                quality: 0.6,
            });
            if (!result.canceled && result.assets?.length) {
                hapticTap("success");
                setUserData({ ...userData, avatar: result.assets[0] });
            }
        } catch {
            hapticTap("error");
            BubblyAlert.alert("Error", "Could not open image library.");
        }
    };

    const handleLogout = async () => {
        hapticTap("heavy");
        await signOut();
    };

    const showLogoutAlert = () => {
        hapticTap("warning");
        BubblyAlert.alert("Sign Out", "Are you sure you want to sign out of Bubbly?", [
            { text: "Cancel", style: 'cancel' },
            { text: "Sign Out", onPress: handleLogout, style: 'destructive' }
        ]);
    };

    const onSubmit = async () => {
        let { name, avatar } = userData;
        if (!name.trim()) {
            hapticTap("error");
            BubblyAlert.alert('Profile', "Please enter your name");
            return;
        }
        if (!isSocketConnected()) {
            hapticTap("error");
            BubblyAlert.alert("Connection Lost", "Please wait until you are connected to update your profile.");
            return;
        }
        hapticTap("heavy");
        setLoading(true);
        let data: any = { name: name.trim(), avatar };
        if (avatar && avatar?.uri) {
            const res = await uploadFileToCloudinary(avatar, "profiles");
            if (res.success) {
                data.avatar = res.data;
            } else {
                BubblyAlert.alert("Upload Failed", res.msg || "Could not upload profile picture");
                setLoading(false);
                return;
            }
        }

        const trimmedPhone = phoneNumber.trim();
        const phoneDigits = trimmedPhone.replace(/\D/g, "");
        if (!trimmedPhone || phoneDigits.length < 7 || phoneDigits.length > 18) {
            setLoading(false);
            BubblyAlert.alert(
                "Phone Number Required",
                "A valid phone number (7 to 18 digits) is required so friends can find you via contact sync."
            );
            return;
        }

        if (trimmedPhone !== (user?.phoneNumber || "")) {
            try {
                await updateUserPhone(trimmedPhone);
            } catch (err: any) {
                setLoading(false);
                BubblyAlert.alert("Phone Number Error", err.message || "Could not update phone number");
                return;
            }
        }

        const nextStatus: CustomStatusState = {
            emoji: statusEmoji.trim(),
            text: statusText.trim(),
            expiresAt: null,
        };
        await saveMyCustomStatus(nextStatus);
        data.customStatus = { emoji: nextStatus.emoji, text: nextStatus.text };

        updateProfile(data);
    };

    return (
        <ScreenWrapper isModal={true}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(220)}
                    style={styles.header}
                >
                    <BackButton color={colors.neutral800} iconSize={22} />
                    <View style={styles.headerTitleWrap}>
                        <Typo size={17} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                            Account & Profile
                        </Typo>
                        <Typo size={11} color={colors.neutral400} fontWeight="500" textProps={{ numberOfLines: 1 }}>
                            Bubbly v4.1.5 Profile
                        </Typo>
                    </View>
                    <View style={{ width: verticalScale(36) }} />
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ── Avatar Section with Halo ── */}
                    <Animated.View
                        entering={FadeInDown.duration(240).delay(30)}
                        style={styles.avatarSection}
                    >
                        <View style={styles.avatarHaloRing}>
                            <View style={styles.avatarContainer}>
                                <Avatar uri={userData.avatar} size={124} />
                                <TouchableOpacity
                                    style={styles.editIcon}
                                    onPress={onPickImage}
                                    activeOpacity={0.8}
                                >
                                    <Icons.Camera
                                        size={verticalScale(16)}
                                        color={colors.black}
                                        weight="bold"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.userInfo}>
                            <Typo size={22} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }} style={{ textAlign: 'center', maxWidth: '100%' }}>
                                {userData.name || "Bubbly User"}
                            </Typo>
                            <View style={styles.statusPill}>
                                <View style={styles.onlineDot} />
                                <Typo size={12} color={colors.neutral600} fontWeight="600" style={{ flexShrink: 1 }} textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}>
                                    Active on Bubbly · {userData.email}
                                </Typo>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Section: Account Information ── */}
                    <Animated.View
                        entering={FadeInDown.duration(260).delay(50)}
                        style={styles.fields}
                    >
                        <Typo
                            size={11}
                            fontWeight="800"
                            color={colors.neutral400}
                            style={styles.sectionLabel}
                        >
                            ACCOUNT DETAILS
                        </Typo>

                        {/* Name Input */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.User
                                    size={verticalScale(14)}
                                    color={colors.primaryDark}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                    DISPLAY NAME
                                </Typo>
                            </View>
                            <Input
                                value={userData.name}
                                onChangeText={value =>
                                    setUserData({ ...userData, name: value })
                                }
                                placeholder="Your full name"
                                icon={
                                    <Icons.PencilSimple
                                        size={verticalScale(18)}
                                        color={colors.neutral400}
                                        weight="bold"
                                    />
                                }
                            />
                        </View>

                        {/* Email (Read Only) */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.Envelope
                                    size={verticalScale(14)}
                                    color={colors.neutral400}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="700" color={colors.neutral500} style={styles.label}>
                                    EMAIL ADDRESS
                                </Typo>
                            </View>
                            <Input
                                value={userData.email}
                                editable={false}
                                containerStyle={styles.disabledInput}
                                icon={
                                    <Icons.Lock
                                        size={verticalScale(16)}
                                        color={colors.neutral400}
                                        weight="fill"
                                    />
                                }
                            />
                            <Typo size={11} color={colors.neutral400} style={{ marginLeft: 6 }}>
                                Linked Google / Email Account (Permanent)
                            </Typo>
                        </View>

                        {/* Phone Number Input */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.Phone
                                    size={verticalScale(14)}
                                    color={colors.primaryDark}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                    PHONE NUMBER *
                                </Typo>
                            </View>
                            <Input
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="+1 555 123 4567"
                                keyboardType="phone-pad"
                                icon={
                                    <Icons.PhoneCall
                                        size={verticalScale(18)}
                                        color={colors.neutral400}
                                        weight="bold"
                                    />
                                }
                            />
                            <Typo size={11} color={colors.neutral400} style={{ marginLeft: 6 }}>
                                Required so phone contacts can discover you on Bubbly
                            </Typo>
                        </View>

                        {/* Custom Live Status */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.Smiley size={verticalScale(14)} color={colors.primaryDark} weight="bold" />
                                <Typo size={12} fontWeight="700" color={colors.neutral600} style={styles.label}>
                                    LIVE ACTIVITY STATUS
                                </Typo>
                            </View>
                            <Input
                                value={statusText}
                                onChangeText={setStatusText}
                                placeholder="What are you up to right now?"
                                icon={<Typo size={16}>{statusEmoji || "💬"}</Typo>}
                                rightIcon={
                                    (statusText || statusEmoji) ? (
                                        <TouchableOpacity onPress={() => { hapticTap("light"); setStatusEmoji(""); setStatusText(""); }}>
                                            <Icons.X size={16} color={colors.neutral400} weight="bold" />
                                        </TouchableOpacity>
                                    ) : undefined
                                }
                            />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
                                {STATUS_PRESETS.map((preset) => {
                                    const active = statusText === preset.text && statusEmoji === preset.emoji;
                                    return (
                                        <TouchableOpacity
                                            key={preset.text}
                                            onPress={() => { hapticTap("medium"); setStatusEmoji(preset.emoji); setStatusText(preset.text); }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                backgroundColor: active ? colors.primaryLight : colors.neutral100,
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.neutral200,
                                                borderRadius: radius.full,
                                                paddingHorizontal: 10,
                                                paddingVertical: 5,
                                            }}
                                        >
                                            <Typo size={12}>{preset.emoji}</Typo>
                                            <Typo size={11.5} fontWeight="600" color={colors.neutral800}>{preset.text}</Typo>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Animated.View>

                    {/* ── Section: Quick Actions & Settings ── */}
                    <Animated.View
                        entering={FadeInDown.duration(240).delay(60)}
                        style={styles.actionsSection}
                    >
                        <Typo
                            size={11}
                            fontWeight="800"
                            color={colors.neutral400}
                            style={styles.sectionLabel}
                        >
                            PREFERENCES & APP
                        </Typo>

                        {/* Invite Friends */}
                        <Pressable
                            onPress={() => {
                                hapticTap("medium");
                                setShowInviteModal(true);
                            }}
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && { opacity: 0.7, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconWrap, { backgroundColor: '#dcfce7' }]}>
                                    <Icons.PaperPlaneTilt
                                        size={verticalScale(18)}
                                        color={'#16a34a'}
                                        weight="fill"
                                    />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                        Invite Friends
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Send SMS, WhatsApp or personal invite link
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* Settings */}
                        <Pressable
                            onPress={() => router.push("/(main)/settings")}
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && { opacity: 0.7, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryLight }]}>
                                    <Icons.GearSix
                                        size={verticalScale(18)}
                                        color={colors.primaryDark}
                                        weight="bold"
                                    />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                        Settings
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Notifications, chat privacy & themes
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* Walkthrough */}
                        <Pressable
                            onPress={() => router.push("/onboarding?replay=true")}
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && { opacity: 0.7, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconWrap, { backgroundColor: '#eff6ff' }]}>
                                    <Icons.BookOpen
                                        size={verticalScale(18)}
                                        color={'#2563eb'}
                                        weight="bold"
                                    />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                        How to Use Bubbly
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Replay interactive onboarding guide
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* About Bubbly */}
                        <Pressable
                            onPress={() => router.push("/(main)/about")}
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && { opacity: 0.7, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconWrap, { backgroundColor: '#fef3c7' }]}>
                                    <Icons.Info
                                        size={verticalScale(18)}
                                        color={colors.primaryDark}
                                        weight="bold"
                                    />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800} textProps={{ numberOfLines: 1 }}>
                                        About Bubbly v4.1.5
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Build info, credits & terms
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* Sign Out */}
                        <Pressable
                            onPress={showLogoutAlert}
                            style={({ pressed }) => [
                                styles.actionCard,
                                pressed && { opacity: 0.7, backgroundColor: '#fef2f2' }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={[styles.actionIconWrap, { backgroundColor: '#fee2e2' }]}>
                                    <Icons.SignOut
                                        size={verticalScale(18)}
                                        color={colors.rose}
                                        weight="bold"
                                    />
                                </View>
                                <View style={styles.actionTextWrap}>
                                    <Typo size={15} fontWeight="700" color={colors.rose} textProps={{ numberOfLines: 1 }}>
                                        Sign Out
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} textProps={{ numberOfLines: 1 }}>
                                        Safely log out of this device
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>
                    </Animated.View>

                </ScrollView>

            {/* ── Footer Button ── */}
            <Animated.View
                entering={FadeInUp.duration(240).delay(70)}
                style={styles.footer}
            >
                <Button
                    style={styles.updateBtn}
                    onPress={onSubmit}
                    loading={loading}
                >
                    <Typo color={colors.black} fontWeight="800" size={16}>
                        Save Profile Changes
                    </Typo>
                </Button>
            </Animated.View>
            </KeyboardAvoidingView>

            <InviteSheetModal
                visible={showInviteModal}
                senderName={user?.name}
                senderId={user?.id}
                onClose={() => setShowInviteModal(false)}
            />
        </ScreenWrapper>
    );
};

export default ProfileModal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    headerTitleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        paddingHorizontal: spacingX._8,
    },
    scrollContent: {
        paddingBottom: spacingY._35,
        gap: spacingY._25,
    },
    avatarSection: {
        alignItems: "center",
        gap: spacingY._15,
        paddingTop: spacingY._25,
        paddingHorizontal: spacingX._20,
    },
    avatarHaloRing: {
        borderRadius: radius.full,
        padding: 5,
        backgroundColor: colors.primaryLight,
        borderWidth: 2,
        borderColor: 'rgba(245,158,11,0.25)',
    },
    avatarContainer: {
        position: "relative",
    },
    editIcon: {
        position: "absolute",
        bottom: 2,
        right: 2,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        padding: spacingY._8,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 2,
        borderColor: colors.white,
    },
    userInfo: {
        alignItems: "center",
        gap: spacingY._5,
        width: "100%",
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.neutral100,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
        maxWidth: '92%',
    },
    onlineDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    fields: {
        paddingHorizontal: spacingX._20,
        gap: spacingY._15,
    },
    sectionLabel: {
        letterSpacing: 1.2,
        marginLeft: 4,
        marginBottom: 2,
    },
    fieldGroup: {
        gap: spacingY._6,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginLeft: 4,
    },
    label: {
        letterSpacing: 1.1,
    },
    disabledInput: {
        backgroundColor: colors.neutral100,
        borderColor: colors.neutral200,
        opacity: 0.7,
    },
    actionsSection: {
        paddingHorizontal: spacingX._20,
        gap: spacingY._10,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.white,
        borderRadius: radius._20,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
    actionLeft: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
        marginRight: spacingX._8,
    },
    actionTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    actionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius._12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    footer: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        paddingBottom: spacingY._12,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
        backgroundColor: colors.white,
    },
    updateBtn: {
        height: verticalScale(54),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
});
