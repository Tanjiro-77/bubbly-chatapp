import React, { useState } from 'react';
import {
    View, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BubblyAlert } from '../../components/BubblyAlert';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale, scale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Loading from '../../components/Loading';
import { createStory, isSocketConnected } from '../../socket/socketEvents';
import { uploadFileToCloudinary } from '../../services/imageService';

interface GradientPreset {
    id: string;
    name: string;
    colors: [string, string, ...string[]];
    textColor: string;
}

const GRADIENT_PRESETS: GradientPreset[] = [
    {
        id: 'sunset',
        name: 'Sunset Amber',
        colors: ['#f59e0b', '#d97706'],
        textColor: '#ffffff',
    },
    {
        id: 'midnight',
        name: 'Midnight Neon',
        colors: ['#4f46e5', '#1e1b4b'],
        textColor: '#ffffff',
    },
    {
        id: 'emerald',
        name: 'Cyber Mint',
        colors: ['#10b981', '#064e3b'],
        textColor: '#ffffff',
    },
    {
        id: 'ruby',
        name: 'Berry Ruby',
        colors: ['#e11d48', '#881337'],
        textColor: '#ffffff',
    },
    {
        id: 'dark',
        name: 'Deep Charcoal',
        colors: ['#27272a', '#09090b'],
        textColor: '#ffffff',
    },
    {
        id: 'ocean',
        name: 'Ocean Dusk',
        colors: ['#2563eb', '#172554'],
        textColor: '#ffffff',
    },
    {
        id: 'mocha',
        name: 'Warm Espresso',
        colors: ['#92400e', '#451a03'],
        textColor: '#ffffff',
    },
];

const CreateStory = () => {
    const router = useRouter();
    const [storyType, setStoryType] = useState<'text' | 'image'>('text');
    const [text, setText] = useState('');
    const [selectedGradient, setSelectedGradient] = useState<GradientPreset>(GRADIENT_PRESETS[0]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [textAlign, setTextAlign] = useState<'center' | 'left' | 'right'>('center');

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setStoryType('image');
        }
    };

    const toggleAlignment = () => {
        setTextAlign(prev => (prev === 'center' ? 'left' : prev === 'left' ? 'right' : 'center'));
    };

    const handleCreate = async () => {
        if (storyType === 'text' && !text.trim()) {
            BubblyAlert.alert('Story Studio', 'Please enter some text for your story');
            return;
        }
        if (storyType === 'image' && !imageUri) {
            BubblyAlert.alert('Story Studio', 'Please choose a photo to share');
            return;
        }

        if (!isSocketConnected()) {
            BubblyAlert.alert('Offline', 'You need an internet connection to post a story.');
            return;
        }

        setLoading(true);
        try {
            let mediaUrl = '';

            if (storyType === 'image' && imageUri) {
                const uploadResult = await uploadFileToCloudinary(
                    { uri: imageUri },
                    'stories'
                );
                if (!uploadResult.success) {
                    BubblyAlert.alert('Upload Failed', 'Could not upload image to cloud');
                    setLoading(false);
                    return;
                }
                mediaUrl = uploadResult.data;
            }

            await new Promise<void>((resolve, reject) => {
                const ackHandler = (res: any) => {
                    clearTimeout(timeout);
                    createStory(ackHandler, true);
                    if (res?.success) resolve();
                    else reject(new Error(res?.msg || 'Failed to publish story'));
                };
                const timeout = setTimeout(() => {
                    createStory(ackHandler, true);
                    reject(new Error('Request timed out'));
                }, 8000);
                createStory(ackHandler);
                createStory({
                    type: storyType,
                    text: text.trim(),
                    backgroundColor: selectedGradient.colors[0],
                    mediaUrl,
                });
            });

            router.back();
        } catch (error) {
            BubblyAlert.alert('Error', 'Could not publish story. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                >
                    <Icons.X size={20} color={colors.neutral800} weight="bold" />
                </TouchableOpacity>

                <View style={styles.titleWrap}>
                    <Typo size={17} fontWeight="800" color={colors.neutral900}>
                        Story Studio
                    </Typo>
                    <Typo size={11} color={colors.neutral400} fontWeight="500">
                        Share for 24 hours
                    </Typo>
                </View>

                <TouchableOpacity
                    style={[styles.shareBtn, (!text.trim() && !imageUri) && styles.shareBtnDisabled]}
                    onPress={handleCreate}
                    activeOpacity={0.8}
                    disabled={loading || (!text.trim() && !imageUri)}
                >
                    {loading ? (
                        <Loading size="small" color={colors.black} />
                    ) : (
                        <Typo size={14} fontWeight="800" color={colors.black}>
                            Share
                        </Typo>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Segmented Type Switcher ── */}
                <View style={styles.typeToggle}>
                    <TouchableOpacity
                        style={[styles.typeBtn, storyType === 'text' && styles.typeBtnActive]}
                        onPress={() => setStoryType('text')}
                        activeOpacity={0.7}
                    >
                        <Icons.TextT
                            size={18}
                            color={storyType === 'text' ? colors.neutral900 : colors.neutral500}
                            weight="bold"
                        />
                        <Typo
                            size={13}
                            fontWeight="700"
                            color={storyType === 'text' ? colors.neutral900 : colors.neutral500}
                        >
                            Text Story
                        </Typo>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, storyType === 'image' && styles.typeBtnActive]}
                        onPress={pickImage}
                        activeOpacity={0.7}
                    >
                        <Icons.Image
                            size={18}
                            color={storyType === 'image' ? colors.neutral900 : colors.neutral500}
                            weight="bold"
                        />
                        <Typo
                            size={13}
                            fontWeight="700"
                            color={storyType === 'image' ? colors.neutral900 : colors.neutral500}
                        >
                            Photo Story
                        </Typo>
                    </TouchableOpacity>
                </View>

                {/* ── Interactive Story Canvas Preview ── */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.previewContainer}
                >
                    {storyType === 'text' ? (
                        <LinearGradient
                            colors={selectedGradient.colors}
                            style={styles.canvasGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <TextInput
                                style={[
                                    styles.textInput,
                                    {
                                        color: selectedGradient.textColor,
                                        textAlign: textAlign,
                                    }
                                ]}
                                placeholder="What's on your mind today?"
                                placeholderTextColor={'rgba(255,255,255,0.5)'}
                                value={text}
                                onChangeText={setText}
                                multiline
                                maxLength={250}
                            />

                            {/* Floating alignment control */}
                            <TouchableOpacity
                                style={styles.floatingAlignBtn}
                                onPress={toggleAlignment}
                                activeOpacity={0.8}
                            >
                                {textAlign === 'center' ? (
                                    <Icons.TextAlignCenter size={16} color={colors.white} weight="bold" />
                                ) : textAlign === 'left' ? (
                                    <Icons.TextAlignLeft size={16} color={colors.white} weight="bold" />
                                ) : (
                                    <Icons.TextAlignRight size={16} color={colors.white} weight="bold" />
                                )}
                            </TouchableOpacity>

                            {/* Character counter */}
                            <View style={styles.charBadge}>
                                <Typo size={11} color={'rgba(255,255,255,0.7)'} fontWeight="600">
                                    {text.length}/250
                                </Typo>
                            </View>
                        </LinearGradient>
                    ) : (
                        <View style={styles.imageCanvas}>
                            {imageUri ? (
                                <View style={StyleSheet.absoluteFill}>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={StyleSheet.absoluteFill}
                                        contentFit="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                                        style={styles.imageBottomGradient}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addImagePlaceholder}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.addIconRing}>
                                        <Icons.Plus size={32} color={colors.primary} weight="bold" />
                                    </View>
                                    <Typo size={16} color={colors.neutral800} fontWeight="700">
                                        Choose Photo
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400} fontWeight="500">
                                        Tap to select from gallery
                                    </Typo>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </Animated.View>

                {/* ── Text Story: Gradient Preset Palette ── */}
                {storyType === 'text' && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.paletteSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Typo size={13} fontWeight="700" color={colors.neutral700}>
                                Background Palette
                            </Typo>
                            <Typo size={12} color={colors.primaryDark} fontWeight="600">
                                {selectedGradient.name}
                            </Typo>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.paletteScroll}
                        >
                            {GRADIENT_PRESETS.map((preset) => {
                                const isSelected = preset.id === selectedGradient.id;
                                return (
                                    <TouchableOpacity
                                        key={preset.id}
                                        onPress={() => setSelectedGradient(preset)}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.gradientPill,
                                            isSelected && styles.gradientPillActive,
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={preset.colors}
                                            style={styles.gradientDot}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                        <Typo
                                            size={12}
                                            fontWeight={isSelected ? '700' : '500'}
                                            color={isSelected ? colors.neutral900 : colors.neutral600}
                                        >
                                            {preset.name}
                                        </Typo>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* ── Photo Story: Caption Input & Change Button ── */}
                {storyType === 'image' && imageUri && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.captionContainer}>
                        <View style={styles.captionInputWrap}>
                            <Icons.ChatText size={18} color={colors.neutral400} weight="bold" />
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Add a caption to your photo..."
                                placeholderTextColor={colors.neutral400}
                                value={text}
                                onChangeText={setText}
                                maxLength={200}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.changeImageBtn}
                            onPress={pickImage}
                            activeOpacity={0.8}
                        >
                            <Icons.ArrowsClockwise size={16} color={colors.neutral700} weight="bold" />
                            <Typo size={13} fontWeight="600" color={colors.neutral700}>
                                Pick Another Photo
                            </Typo>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default CreateStory;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacingX._20,
        paddingTop: verticalScale(Platform.OS === 'ios' ? 55 : 42),
        paddingBottom: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    closeBtn: {
        width: verticalScale(38),
        height: verticalScale(38),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: {
        alignItems: 'center',
    },
    shareBtn: {
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._10,
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        minWidth: verticalScale(74),
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    shareBtnDisabled: {
        opacity: 0.5,
        backgroundColor: colors.neutral200,
    },
    scrollContent: {
        padding: spacingX._20,
        gap: spacingY._20,
        paddingBottom: verticalScale(40),
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        padding: 4,
        gap: 4,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._7,
        paddingVertical: spacingY._10,
        borderRadius: radius.full,
    },
    typeBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    previewContainer: {
        height: verticalScale(390),
        borderRadius: radius._24,
        overflow: 'hidden',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 4,
    },
    canvasGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacingX._25,
    },
    textInput: {
        width: '100%',
        lineHeight: verticalScale(34),
        fontSize: verticalScale(24),
        fontWeight: '800',
    },
    floatingAlignBtn: {
        position: 'absolute',
        top: spacingY._15,
        right: spacingX._15,
        width: scale(34),
        height: scale(34),
        borderRadius: radius.full,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    charBadge: {
        position: 'absolute',
        bottom: spacingY._15,
        right: spacingX._15,
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: spacingX._10,
        paddingVertical: spacingY._4,
        borderRadius: radius.full,
    },
    imageCanvas: {
        flex: 1,
        backgroundColor: colors.neutral100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageBottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: verticalScale(80),
    },
    addImagePlaceholder: {
        alignItems: 'center',
        gap: spacingY._10,
    },
    addIconRing: {
        width: scale(64),
        height: scale(64),
        borderRadius: radius.full,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    paletteSection: {
        gap: spacingY._12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    paletteScroll: {
        gap: spacingX._10,
        paddingVertical: spacingY._5,
    },
    gradientPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._8,
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    gradientPillActive: {
        backgroundColor: colors.white,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    gradientDot: {
        width: scale(20),
        height: scale(20),
        borderRadius: radius.full,
    },
    captionContainer: {
        gap: spacingY._12,
    },
    captionInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    captionInput: {
        flex: 1,
        fontSize: verticalScale(14),
        color: colors.neutral900,
    },
    changeImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._7,
        alignSelf: 'center',
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._10,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
    },
});
