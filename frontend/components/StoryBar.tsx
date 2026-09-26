import React, { useEffect, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { colors, radius, spacingX, spacingY } from '../constants/theme';
import { verticalScale } from '../utils/styling';
import Typo from './Typo';
import Avatar from './Avatar';
import { useAuth } from '../contexts/authContext';
import {
    getStories, onStoryFeedUpdated,
} from '../socket/socketEvents';
import { StoryGroupProps, ResponseProps } from '../types';

const StoryBar = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [storyGroups, setStoryGroups] = useState<StoryGroupProps[]>([]);

    // ─────────────────────────────────────────────
    // FETCH STORIES
    // ─────────────────────────────────────────────
    const fetchStories = useCallback(() => {
        getStories(null); // emit
    }, []);

    useEffect(() => {
        // ── Register listener ──
        getStories(storiesHandler);
        onStoryFeedUpdated(feedUpdatedHandler);

        // ── Fetch ──
        fetchStories();

        return () => {
            getStories(storiesHandler, true);
            onStoryFeedUpdated(feedUpdatedHandler, true);
        };
    }, []);

    const storiesHandler = (res: ResponseProps) => {
        if (res.success) {
            setStoryGroups(res.data);
        }
    };

    const feedUpdatedHandler = () => {
        fetchStories();
    };

    // ─────────────────────────────────────────────
    // OPEN STORY VIEWER
    // ─────────────────────────────────────────────
    const openStory = (groupIndex: number) => {
        router.push({
            pathname: '/(main)/storyViewer',
            params: {
                groupIndex: groupIndex.toString(),
                storiesData: JSON.stringify(storyGroups),
            },
        });
    };

    // ─────────────────────────────────────────────
    // MY STORY
    // ─────────────────────────────────────────────
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
                <View style={styles.storyWrap}>
                    <TouchableOpacity
                        style={styles.myStoryBtn}
                        onPress={() => {
                            if (myStoryGroup) {
                                openStory(myStoryIndex);
                            } else {
                                router.push('/(main)/createStory');
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.myAvatarWrap}>
                            <Avatar
                                size={54}
                                uri={currentUser?.avatar || null}
                            />
                            {!myStoryGroup && (
                                <View style={styles.addBtn}>
                                    <Icons.Plus
                                        size={10}
                                        color={colors.black}
                                        weight="bold"
                                    />
                                </View>
                            )}
                            {myStoryGroup && (
                                <View style={styles.myStoryRing} />
                            )}
                        </View>
                    </TouchableOpacity>
                    <Typo
                        size={11}
                        fontWeight="600"
                        color={colors.neutral600}
                        textProps={{ numberOfLines: 1 }}
                        style={styles.storyName}
                    >
                        {myStoryGroup ? 'My Story' : 'Add Story'}
                    </Typo>
                    {myStoryGroup && (
                        <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => router.push('/(main)/createStory')}
                            activeOpacity={0.8}
                        >
                            <Icons.Plus size={10} color={colors.neutral600} weight="bold" />
                        </TouchableOpacity>
                    )}
                </View>

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
                            <View style={[
                                styles.storyRing,
                                group.hasUnseen
                                    ? styles.unseenRing
                                    : styles.seenRing,
                            ]}>
                                <Avatar size={50} uri={group.user.avatar} />
                            </View>
                            <Typo
                                size={11}
                                fontWeight={group.hasUnseen ? "700" : "500"}
                                color={group.hasUnseen ? colors.neutral800 : colors.neutral500}
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
        marginBottom: spacingY._10,
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        gap: spacingX._15,
        paddingVertical: spacingY._5,
    },
    storyWrap: {
        alignItems: 'center',
        gap: spacingY._5,
        position: 'relative',
    },
    myStoryBtn: {
        alignItems: 'center',
    },
    myAvatarWrap: {
        position: 'relative',
    },
    addBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: verticalScale(18),
        height: verticalScale(18),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    myStoryRing: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    addMoreBtn: {
        position: 'absolute',
        top: 0,
        right: -4,
        width: verticalScale(16),
        height: verticalScale(16),
        borderRadius: radius.full,
        backgroundColor: colors.neutral200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyRing: {
        padding: 2,
        borderRadius: radius.full,
        borderWidth: 2.5,
    },
    unseenRing: {
        borderColor: colors.primary,
    },
    seenRing: {
        borderColor: colors.neutral300,
    },
    storyName: {
        maxWidth: verticalScale(60),
        textAlign: 'center',
    },
});