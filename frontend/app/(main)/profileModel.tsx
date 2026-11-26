import {
    Platform, ScrollView, StyleSheet,
    TouchableOpacity, View, Pressable,
} from 'react-native';
import { BubblyAlert } from "../../components/BubblyAlert";
import React, { useEffect, useState } from 'react';
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import { scale, verticalScale } from "../../utils/styling";
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

const ProfileModal = () => {
    const { user, signOut, updateToken, updateUserPhone } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [userData, setUserData] = useState<UserDataProps>({
        name: "",
        email: "",
        avatar: null
    });
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");

    useEffect(() => {
        updateProfile(processUpdateProfile);
        return () => { updateProfile(processUpdateProfile, true); };
    }, []);

    const processUpdateProfile = async (res: any) => {
        setLoading(false);
        if (res.success) {
            await updateToken(res.data.token);
            router.back();
        } else {
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
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            aspect: [1, 1],
            quality: 0.6,
        });
        if (!result.canceled) {
            setUserData({ ...userData, avatar: result.assets[0] });
        }
    };

    const handleLogout = async () => {
        await signOut();
    };

    const showLogoutAlert = () => {
        BubblyAlert.alert("Sign Out", "Are you sure you want to sign out of Bubbly?", [
            { text: "Cancel", style: 'cancel' },
            { text: "Sign Out", onPress: handleLogout, style: 'destructive' }
        ]);
    };

    const onSubmit = async () => {
        let { name, avatar } = userData;
        if (!name.trim()) {
            BubblyAlert.alert('Profile', "Please enter your name");
            return;
        }
        if (!isSocketConnected()) {
            BubblyAlert.alert("Connection Lost", "Please wait until you are connected to update your profile.");
            return;
        }
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

        if (phoneNumber.trim() !== (user?.phoneNumber || "")) {
            try {
                await updateUserPhone(phoneNumber.trim());
            } catch (err: any) {
                setLoading(false);
                BubblyAlert.alert("Phone Number Error", err.message || "Could not update phone number");
                return;
            }
        }

        updateProfile(data);
    };

    return (
        <ScreenWrapper isModal={true}>
            <View style={styles.container}>

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(400).springify()}
                    style={styles.header}
                >
                    <BackButton color={colors.neutral800} iconSize={22} />
                    <View style={styles.headerTitleWrap}>
                        <Typo size={17} fontWeight="800" color={colors.neutral900}>
                            Account & Profile
                        </Typo>
                        <Typo size={11} color={colors.neutral400} fontWeight="500">
                            Bubbly v3.4.0 Profile
                        </Typo>
                    </View>
                    <View style={{ width: 22 }} />
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ── Avatar Section with Halo ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(80).springify()}
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
                            <Typo size={22} fontWeight="800" color={colors.neutral900}>
                                {userData.name || "Bubbly User"}
                            </Typo>
                            <View style={styles.statusPill}>
                                <View style={styles.onlineDot} />
                                <Typo size={12} color={colors.neutral600} fontWeight="600">
                                    Active on Bubbly · {userData.email}
                                </Typo>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Section: Account Information ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(150).springify()}
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
                                    PHONE NUMBER
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
                                Allows your phone contacts to discover you on Bubbly
                            </Typo>
                        </View>
                    </Animated.View>

                    {/* ── Section: Quick Actions & Settings ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(220).springify()}
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
                                <View>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800}>
                                        Settings
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
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
                                <View>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800}>
                                        How to Use Bubbly
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
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
                                <View>
                                    <Typo size={15} fontWeight="700" color={colors.neutral800}>
                                        About Bubbly Release v3.0
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
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
                                <View>
                                    <Typo size={15} fontWeight="700" color={colors.rose}>
                                        Sign Out
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
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
            </View>

            {/* ── Footer Button ── */}
            <Animated.View
                entering={FadeInUp.duration(500).delay(250).springify()}
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
        alignItems: 'center',
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
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.neutral100,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
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
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
    },
    actionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius._12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 35 : 20),
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
