import React, { useEffect, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../constants/theme';
import { verticalScale, scale } from '../utils/styling';
import Typo from './Typo';
import Avatar from './Avatar';
import { useAuth } from '../contexts/authContext';
import {
    getStories, onStoryFeedUpdated, onSocketConnectionChange,
} from '../socket/socketEvents';
import { StoryGroupProps, ResponseProps } from '../types';

const StoryBar = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [storyGroups, setStoryGroups] = useState<StoryGroupProps[]>([]);

    const fetchStories = useCallback(() => {
        getStories(null);
    }, []);

    useEffect(() => {
        getStories(storiesHandler);
        onStoryFeedUpdated(feedUpdatedHandler);
        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected) fetchStories();
        });
        fetchStories();

        return () => {
            getStories(storiesHandler, true);
            onStoryFeedUpdated(feedUpdatedHandler, true);
            unsubConn();
        };
    }, []);

    const storiesHandler = (res: ResponseProps) => {
        if (res.success && Array.isArray(res.data)) {
            setStoryGroups(res.data);
        }
    };

    const feedUpdatedHandler = () => {
        fetchStories();
    };

    const openStory = (groupIndex: number) => {
        router.push({
            pathname: '/(main)/storyViewer',
            params: {
                groupIndex: groupIndex.toString(),
                storiesData: JSON.stringify(storyGroups),
            },
        });
    };

    const myStoryGroup = storyGroups.find(g => g.user.id === currentUser?.id);
    const myStoryIndex = storyGroups.findIndex(g => g.user.id === currentUser?.id);
    const otherGroups = storyGroups.filter(g => g.user.id !== currentUser?.id);

    return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── My Story / Add Story ── */}
                <TouchableOpacity
                    style={styles.storyWrap}
                    onPress={() => {
                        if (myStoryGroup) {
                            openStory(myStoryIndex);
                        } else {
                            router.push('/(main)/createStory');
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.avatarWrap}>
                        {myStoryGroup ? (
                            <LinearGradient
                                colors={['#f59e0b', '#fbbf24', '#fde047']}
                                style={styles.gradientRing}
                            >
                                <View style={styles.innerRingPad}>
                                    <Avatar size={52} uri={currentUser?.avatar || null} />
                                </View>
                            </LinearGradient>
                        ) : (
                            <View style={styles.myStoryOutline}>
                                <Avatar size={52} uri={currentUser?.avatar || null} />
                            </View>
                        )}

                        {/* Plus badge (separate tap target so users can add multiple stories) */}
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={(e) => {
                                e.stopPropagation?.();
                                router.push('/(main)/createStory');
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            activeOpacity={0.85}
                        >
                            <Icons.Plus
                                size={verticalScale(11)}
                                color={colors.neutral900}
                                weight="bold"
                            />
                        </TouchableOpacity>
                    </View>

                    <Typo
                        size={11.5}
                        fontWeight={myStoryGroup ? "700" : "600"}
                        color={myStoryGroup ? colors.neutral900 : colors.neutral600}
                        textProps={{ numberOfLines: 1 }}
                        style={styles.storyName}
                    >
                        {myStoryGroup ? 'Your story' : 'Add story'}
                    </Typo>
                </TouchableOpacity>

                {/* ── Other Stories ── */}
                {otherGroups.map((group, index) => {
                    const realIndex = storyGroups.findIndex(g => g.user.id === group.user.id);
                    return (
                        <TouchableOpacity
                            key={group.user.id}
                            style={styles.storyWrap}
                            onPress={() => openStory(realIndex)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.avatarWrap}>
                                {group.hasUnseen ? (
                                    <LinearGradient
                                        colors={['#f59e0b', '#facc15', '#fde047']}
                                        style={styles.gradientRing}
                                    >
                                        <View style={styles.innerRingPad}>
                                            <Avatar size={52} uri={group.user.avatar} />
                                        </View>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.seenRing}>
                                        <Avatar size={52} uri={group.user.avatar} />
                                    </View>
                                )}
                            </View>

                            <Typo
                                size={11.5}
                                fontWeight={group.hasUnseen ? "700" : "500"}
                                color={group.hasUnseen ? colors.neutral900 : colors.neutral500}
                                textProps={{ numberOfLines: 1 }}
                                style={styles.storyName}
                            >
                                {group.user.name.split(' ')[0]}
                            </Typo>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
};

export default StoryBar;

const styles = StyleSheet.create({
    container: {
        marginBottom: spacingY._8,
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        gap: spacingX._12,
        paddingVertical: spacingY._5,
    },
    storyWrap: {
        alignItems: 'center',
        gap: spacingY._5,
        width: scale(66),
    },
    avatarWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    gradientRing: {
        padding: 2.5,
        borderRadius: radius.full,
    },
    innerRingPad: {
        padding: 2,
        borderRadius: radius.full,
        backgroundColor: colors.white,
    },
    myStoryOutline: {
        padding: 3,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.neutral300,
    },
    seenRing: {
        padding: 3,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
    },
    addBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: verticalScale(20),
        height: verticalScale(20),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
    },
    storyName: {
        width: "100%",
        textAlign: 'center',
    },
});
