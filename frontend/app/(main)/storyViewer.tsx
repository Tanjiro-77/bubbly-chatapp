import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Dimensions,
    TextInput, KeyboardAvoidingView, Platform,
    FlatList, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BubblyAlert } from '../../components/BubblyAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, runOnJS, FadeIn, FadeOut,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale, scale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../contexts/authContext';
import {
    viewStory, reactToStory, deleteStory,
    replyToStory, isSocketConnected,
} from '../../socket/socketEvents';
import { StoryGroupProps } from '../../types';
import moment from 'moment';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000;

const EMOJIS = ['❤️', '🔥', '😂', '👏', '😍', '😮'];

const StoryViewer = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();
    const { groupIndex: groupIndexParam, storiesData } = useLocalSearchParams();

    const allGroups: StoryGroupProps[] = useMemo(() => {
        try {
            const raw = Array.isArray(storiesData) ? storiesData[0] : storiesData;
            if (!raw || typeof raw !== 'string') return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [storiesData]);

    const parsedGroupIdx = parseInt(Array.isArray(groupIndexParam) ? groupIndexParam[0] : (groupIndexParam as string), 10) || 0;
    const [currentGroupIndex, setCurrentGroupIndex] = useState(parsedGroupIdx);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showViewers, setShowViewers] = useState(false);

    const progress = useSharedValue(0);
    const startTimeRef = useRef<number>(0);
    const elapsedRef = useRef<number>(0);
    const isPausedRef = useRef<boolean>(false);

    const currentGroup = allGroups[currentGroupIndex];
    const currentStory = currentGroup?.stories?.[currentStoryIndex];
    const isMyStory = currentStory && currentUser?.id === currentGroup?.user?.id;

    const safeBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(main)/home');
    }, [router]);

    useEffect(() => {
        if (!currentGroup || !currentStory) {
            safeBack();
        }
    }, [currentGroup, currentStory, safeBack]);

    // ─────────────────────────────────────────────
    // PROGRESS & TIMER
    // ─────────────────────────────────────────────
    const goToNext = useCallback(() => {
        cancelAnimation(progress);
        const group = allGroups[currentGroupIndex];
        if (!group) { safeBack(); return; }

        if (currentStoryIndex < group.stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentGroupIndex < allGroups.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
        } else {
            safeBack();
        }
    }, [currentGroupIndex, currentStoryIndex, allGroups, safeBack, progress]);

    const startProgress = useCallback((fromElapsed = 0) => {
        const remaining = Math.max(100, STORY_DURATION - fromElapsed);
        startTimeRef.current = Date.now();
        elapsedRef.current = fromElapsed;

        progress.value = fromElapsed / STORY_DURATION;
        progress.value = withTiming(1, { duration: remaining }, (finished) => {
            if (finished) {
                runOnJS(goToNext)();
            }
        });
    }, [goToNext, progress]);

    const pauseProgress = () => {
        if (isPausedRef.current) return;
        isPausedRef.current = true;
        const elapsed = Date.now() - startTimeRef.current + elapsedRef.current;
        elapsedRef.current = elapsed;
        cancelAnimation(progress);
        setIsPaused(true);
    };

    const resumeProgress = () => {
        isPausedRef.current = false;
        setIsPaused(false);
        startProgress(elapsedRef.current);
    };

    useEffect(() => {
        if (!currentStory) return;
        isPausedRef.current = false;
        elapsedRef.current = 0;
        progress.value = 0;
        startProgress(0);

        viewStory({ storyId: currentStory._id });

        return () => {
            cancelAnimation(progress);
        };
    }, [currentGroupIndex, currentStoryIndex, currentStory?._id]);

    // ─────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────
    const goToPrev = useCallback(() => {
        cancelAnimation(progress);
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentGroupIndex > 0) {
            setCurrentGroupIndex(prev => prev - 1);
            setCurrentStoryIndex(allGroups[currentGroupIndex - 1].stories.length - 1);
        } else {
            isPausedRef.current = false;
            elapsedRef.current = 0;
            startProgress(0);
        }
    }, [currentGroupIndex, currentStoryIndex, allGroups, progress, startProgress]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    // ─────────────────────────────────────────────
    // REPLY
    // ─────────────────────────────────────────────
    const handleReply = () => {
        if (!replyText.trim()) return;
        if (!isSocketConnected()) {
            BubblyAlert.alert('Offline', 'Connect to the internet to reply to a story.');
            return;
        }
        const ack = (res: any) => {
            replyToStory(ack, true);
            if (res?.success) {
                BubblyAlert.alert('✅ Message Sent', 'Your reply was delivered to ' + currentGroup.user.name);
            } else {
                BubblyAlert.alert('Reply Failed', res?.msg || 'Could not send story reply.');
            }
        };
        replyToStory(ack);
        replyToStory({
            storyId: currentStory._id,
            content: replyText.trim(),
        });
        setReplyText('');
        setShowReplyInput(false);
        resumeProgress();
    };

    // ─────────────────────────────────────────────
    // REACT
    // ─────────────────────────────────────────────
    const handleReact = (emoji: string) => {
        if (!isSocketConnected()) {
            BubblyAlert.alert('Offline', 'Connect to the internet to react to a story.');
            setShowEmojiPicker(false);
            resumeProgress();
            return;
        }
        reactToStory({
            storyId: currentStory._id,
            emoji,
        });
        setShowEmojiPicker(false);
        resumeProgress();
    };

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────
    const handleDelete = () => {
        pauseProgress();
        BubblyAlert.alert(
            'Delete Story',
            'Are you sure you want to delete this story? It will be removed for everyone.',
            [
                { text: 'Cancel', style: 'cancel', onPress: resumeProgress },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteStory({ storyId: currentStory._id });
                        safeBack();
                    },
                },
            ]
        );
    };

    if (!currentGroup || !currentStory) {
        return null;
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── Background Media or Gradient ── */}
            {currentStory.type === 'image' ? (
                <Image
                    source={{ uri: currentStory.mediaUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
            ) : (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: currentStory.backgroundColor || '#18181b' }
                    ]}
                />
            )}

            {/* ── Subtle Vignette Gradients for readability ── */}
            <LinearGradient
                colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.7)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* ── Progress Bars ── */}
            <View style={[styles.progressContainer, { paddingTop: Math.max(insets.top, 16) + verticalScale(8) }]}>
                {currentGroup.stories.map((_, idx) => (
                    <View key={idx} style={styles.progressTrack}>
                        {idx < currentStoryIndex ? (
                            <View style={[styles.progressFill, { width: '100%' }]} />
                        ) : idx === currentStoryIndex ? (
                            <Animated.View style={[styles.progressFill, progressStyle]} />
                        ) : null}
                    </View>
                ))}
            </View>

            {/* ── Author Header ── */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <View style={styles.avatarBorder}>
                        <Avatar size={40} uri={currentGroup.user.avatar} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Typo size={15} fontWeight="800" color={colors.white} textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}>
                            {currentGroup.user.name}
                        </Typo>
                        <Typo size={11} color={'rgba(255,255,255,0.7)'} fontWeight="500">
                            {moment(currentStory.createdAt).fromNow()}
                        </Typo>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    {isMyStory && (
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Icons.Trash size={18} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Icons.X size={20} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Text Story Content ── */}
            {currentStory.type === 'text' && currentStory.text && (
                <View style={styles.textContent}>
                    <Typo
                        size={28}
                        fontWeight="800"
                        color={colors.white}
                        style={styles.storyText}
                    >
                        {currentStory.text}
                    </Typo>
                </View>
            )}

            {/* ── Photo Story Caption (if any) ── */}
            {currentStory.type === 'image' && currentStory.text ? (
                <View style={[styles.imageCaptionWrap, { bottom: Math.max(insets.bottom, 16) + verticalScale(84) }]}>
                    <Typo size={16} fontWeight="600" color={colors.white} style={styles.imageCaptionText}>
                        {currentStory.text}
                    </Typo>
                </View>
            ) : null}

            {/* ── Tap Navigation Zones ── */}
            <View style={styles.tapZones}>
                <TouchableOpacity
                    style={styles.tapLeft}
                    onPress={goToPrev}
                    onLongPress={() => {
                        pauseProgress();
                        setIsPaused(true);
                    }}
                    onPressOut={() => {
                        if (isPaused) resumeProgress();
                    }}
                    activeOpacity={1}
                />
                <TouchableOpacity
                    style={styles.tapRight}
                    onPress={goToNext}
                    onLongPress={() => {
                        pauseProgress();
                        setIsPaused(true);
                    }}
                    onPressOut={() => {
                        if (isPaused) resumeProgress();
                    }}
                    activeOpacity={1}
                />
            </View>

            {/* ── Bottom Interaction Dock ── */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + spacingY._12 }]}>
                {isMyStory ? (
                    // ── Author View: Viewers count button ──
                    <TouchableOpacity
                        style={styles.viewersBtn}
                        onPress={() => {
                            pauseProgress();
                            setShowViewers(true);
                        }}
                        activeOpacity={0.8}
                    >
                        <Icons.Eye size={18} color={colors.primary} weight="fill" />
                        <Typo size={13} color={colors.white} fontWeight="700">
                            {(currentStory.viewers || []).length} {(currentStory.viewers || []).length === 1 ? 'Viewer' : 'Viewers'}
                        </Typo>
                        <Icons.CaretUp size={14} color={'rgba(255,255,255,0.7)'} weight="bold" />
                    </TouchableOpacity>
                ) : (
                    // ── Viewer View: Emoji reaction dock + reply input ──
                    <View style={styles.replyRow}>
                        {/* Quick emoji reactions */}
                        {showEmojiPicker && (
                            <Animated.View
                                entering={FadeIn.duration(200)}
                                exiting={FadeOut.duration(150)}
                                style={styles.emojiPicker}
                            >
                                {EMOJIS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        onPress={() => handleReact(emoji)}
                                        style={styles.emojiBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Typo size={26}>{emoji}</Typo>
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            style={styles.emojiToggle}
                            onPress={() => {
                                setShowEmojiPicker(prev => !prev);
                                if (!showEmojiPicker) pauseProgress();
                                else resumeProgress();
                            }}
                            activeOpacity={0.8}
                        >
                            <Typo size={22}>✨</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.replyInputPill}
                            onPress={() => {
                                pauseProgress();
                                setShowReplyInput(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <Typo size={14} color={'rgba(255,255,255,0.7)'} fontWeight="500">
                                Reply to {currentGroup.user.name}...
                            </Typo>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── Reply Input Modal Sheet ── */}
            {showReplyInput && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.replyModal, { paddingBottom: Math.max(insets.bottom, 16) + spacingY._12 }]}
                >
                    <View style={styles.replyInputRow}>
                        <TextInput
                            style={styles.replyTextInput}
                            placeholder="Type a message..."
                            placeholderTextColor={'rgba(255,255,255,0.5)'}
                            value={replyText}
                            onChangeText={setReplyText}
                            autoFocus
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={styles.replySendBtn}
                            onPress={handleReply}
                            activeOpacity={0.8}
                        >
                            <Icons.PaperPlaneTilt
                                size={18}
                                color={colors.black}
                                weight="fill"
                            />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setShowReplyInput(false);
                            resumeProgress();
                        }}
                        style={styles.cancelReply}
                    >
                        <Typo size={13} color={'rgba(255,255,255,0.7)'} fontWeight="600">Cancel</Typo>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ── Viewers Sheet ── */}
            {showViewers && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.viewersModal, { paddingBottom: Math.max(insets.bottom, 16) + spacingY._12 }]}
                >
                    <View style={styles.viewersHeader}>
                        <View style={styles.viewersTitleWrap}>
                            <Icons.Eye size={18} color={colors.primaryDark} weight="fill" />
                            <Typo size={16} fontWeight="800" color={colors.neutral900}>
                                Story Viewers ({(currentStory.viewers || []).length})
                            </Typo>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setShowViewers(false);
                                resumeProgress();
                            }}
                            style={styles.viewersCloseBtn}
                        >
                            <Icons.X size={18} color={colors.neutral600} weight="bold" />
                        </TouchableOpacity>
                    </View>
                    {(currentStory.viewers || []).length === 0 ? (
                        <View style={styles.noViewers}>
                            <Icons.UsersThree size={36} color={colors.neutral300} />
                            <Typo size={14} color={colors.neutral500} fontWeight="600">No viewers yet</Typo>
                            <Typo size={12} color={colors.neutral400}>When friends view your story, they will appear here</Typo>
                        </View>
                    ) : (
                        <FlatList
                            data={currentStory.viewers}
                            keyExtractor={(item, idx) => idx.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.viewerItem}>
                                    <View style={styles.viewerIconWrap}>
                                        <Icons.Eye size={15} color={colors.primaryDark} />
                                    </View>
                                    <View>
                                        <Typo size={13} fontWeight="600" color={colors.neutral800}>
                                            Viewed
                                        </Typo>
                                        <Typo size={11} color={colors.neutral400}>
                                            {moment(item.viewedAt).fromNow()}
                                        </Typo>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
};

export default StoryViewer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.black,
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacingX._12,
        paddingTop: verticalScale(Platform.OS === 'ios' ? 55 : 40),
        gap: 4,
        zIndex: 10,
    },
    progressTrack: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.white,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._15,
        zIndex: 10,
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
        marginRight: spacingX._8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    avatarBorder: {
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.primary,
        padding: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
    },
    headerBtn: {
        padding: spacingX._8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    textContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacingX._30,
        zIndex: 5,
    },
    storyText: {
        textAlign: 'center',
        lineHeight: 40,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    imageCaptionWrap: {
        position: 'absolute',
        bottom: verticalScale(110),
        left: spacingX._20,
        right: spacingX._20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10,
        borderRadius: radius._15,
        zIndex: 6,
    },
    imageCaptionText: {
        textAlign: 'center',
    },
    tapZones: {
        ...StyleSheet.absoluteFill,
        flexDirection: 'row',
        zIndex: 4,
    },
    tapLeft: {
        flex: 1,
    },
    tapRight: {
        flex: 2,
    },
    bottomBar: {
        paddingHorizontal: spacingX._15,
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 40 : 25),
        paddingTop: spacingY._15,
        zIndex: 10,
    },
    viewersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._8,
        alignSelf: 'center',
        backgroundColor: 'rgba(24,24,27,0.75)',
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._10,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    replyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    emojiToggle: {
        width: verticalScale(44),
        height: verticalScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    replyInputPill: {
        flex: 1,
        height: verticalScale(44),
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: spacingX._20,
        justifyContent: 'center',
    },
    emojiPicker: {
        position: 'absolute',
        bottom: verticalScale(60),
        left: 0,
        flexDirection: 'row',
        backgroundColor: 'rgba(24,24,27,0.92)',
        borderRadius: radius._24,
        padding: spacingX._10,
        gap: spacingX._8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        zIndex: 20,
    },
    emojiBtn: {
        padding: spacingX._4,
    },
    replyModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(9,9,11,0.95)',
        padding: spacingX._20,
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 40 : 25),
        gap: spacingY._12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        zIndex: 20,
    },
    replyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radius._20,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    replyTextInput: {
        flex: 1,
        fontSize: verticalScale(14),
        maxHeight: verticalScale(100),
        color: colors.white,
    },
    replySendBtn: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelReply: {
        alignSelf: 'center',
    },
    viewersModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        padding: spacingX._20,
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 40 : 25),
        maxHeight: SCREEN_HEIGHT * 0.5,
        zIndex: 20,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    viewersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacingY._15,
    },
    viewersTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
    },
    viewersCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._12,
        paddingVertical: spacingY._10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    viewerIconWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noViewers: {
        alignItems: 'center',
        gap: spacingY._8,
        paddingVertical: spacingY._35,
    },
});
