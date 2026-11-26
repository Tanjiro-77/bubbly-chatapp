import React, { useMemo } from 'react';
import { StyleSheet, Text, TextStyle, View, Linking, TouchableOpacity } from 'react-native';
import { colors, radius, spacingX, spacingY } from '../constants/theme';
import { scale, verticalScale } from '../utils/styling';

interface FormattedTextProps {
    content: string;
    color?: string;
    size?: number;
    searchHighlight?: string;
    style?: TextStyle;
}

type InlineToken = {
    type: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'url' | 'email' | 'phone' | 'mention' | 'highlight';
    value: string;
    url?: string;
};

/**
 * WhatsApp-style inline tokenizer:
 * Supports *bold*, _italic_, ~strike~, `code`, URLs, emails, phone numbers, @mentions, and search highlights.
 */
function parseInline(text: string, highlight?: string): InlineToken[] {
    if (!text) return [];

    // Order matters: URL -> Email -> Mention -> Phone (only phone-like numbers, excluding YYYY-MM-DD)
    const entityRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|@[a-zA-Z0-9_.-]{2,32}|(?:\+\d[\d\s()-]{6,16}\d|\(\d{2,5}\)[\d\s-]{5,12}\d|\b\d{3,4}[\s-]\d{3,4}(?:[\s-]\d{2,5})?\b))/gi;
    const baseTokens: InlineToken[] = [];

    const parseFormatting = (input: string) => {
        const formatRegex = /(\*[^\s*](?:[^*]*[^\s*])?\*|_[^\s_](?:[^_]*[^\s_])?_|~[^\s~](?:[^~]*[^\s~])?~|`[^`\n]+`)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = formatRegex.exec(input)) !== null) {
            if (match.index > lastIndex) {
                baseTokens.push({ type: 'text', value: input.slice(lastIndex, match.index) });
            }

            const raw = match[0];
            if (raw.startsWith('*') && raw.endsWith('*')) {
                baseTokens.push({ type: 'bold', value: raw.slice(1, -1) });
            } else if (raw.startsWith('_') && raw.endsWith('_')) {
                baseTokens.push({ type: 'italic', value: raw.slice(1, -1) });
            } else if (raw.startsWith('~') && raw.endsWith('~')) {
                baseTokens.push({ type: 'strike', value: raw.slice(1, -1) });
            } else if (raw.startsWith('`') && raw.endsWith('`')) {
                baseTokens.push({ type: 'code', value: raw.slice(1, -1) });
            } else {
                baseTokens.push({ type: 'text', value: raw });
            }

            lastIndex = match.index + raw.length;
        }

        if (lastIndex < input.length) {
            baseTokens.push({ type: 'text', value: input.slice(lastIndex) });
        }
    };

    const parseEntitiesAndFormatting = (input: string) => {
        let lastIdx = 0;
        let match: RegExpExecArray | null;
        entityRegex.lastIndex = 0;

        while ((match = entityRegex.exec(input)) !== null) {
            if (match.index > lastIdx) {
                parseFormatting(input.slice(lastIdx, match.index));
            }
            const rawToken = match[0];
            if (/^https?:\/\//i.test(rawToken) || /^www\./i.test(rawToken)) {
                // Trim trailing punctuation / markdown delimiters that aren't part of the URL
                const trimmed = rawToken.replace(/[.,!?;:*_~]+$/, '');
                const trailing = rawToken.slice(trimmed.length);
                const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
                baseTokens.push({ type: 'url', value: trimmed, url: fullUrl });
                if (trailing) parseFormatting(trailing);
            } else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(rawToken)) {
                baseTokens.push({ type: 'email', value: rawToken, url: `mailto:${rawToken}` });
            } else if (rawToken.startsWith('@')) {
                baseTokens.push({ type: 'mention', value: rawToken });
            } else {
                const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(rawToken);
                const digits = rawToken.replace(/[^\d+]/g, '');
                const digitCount = digits.replace(/\D/g, '').length;
                if (!isIsoDate && digitCount >= 7 && digitCount <= 15) {
                    baseTokens.push({ type: 'phone', value: rawToken, url: `tel:${digits}` });
                } else {
                    parseFormatting(rawToken);
                }
            }
            lastIdx = match.index + rawToken.length;
        }

        if (lastIdx < input.length) {
            parseFormatting(input.slice(lastIdx));
        }
    };

    parseEntitiesAndFormatting(text);

    // Apply search highlighting AFTER entity & markdown tokenization so tokens stay intact
    const q = highlight?.trim();
    if (!q) return baseTokens;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const splitRegex = new RegExp(`(${escaped})`, 'gi');
    const exactRegex = new RegExp(`^${escaped}$`, 'i');
    const finalTokens: InlineToken[] = [];

    for (const tok of baseTokens) {
        if (tok.type === 'text' || tok.type === 'bold' || tok.type === 'italic' || tok.type === 'strike') {
            const parts = tok.value.split(splitRegex);
            for (const part of parts) {
                if (!part) continue;
                if (exactRegex.test(part)) {
                    finalTokens.push({ type: 'highlight', value: part });
                } else {
                    finalTokens.push({ ...tok, value: part });
                }
            }
        } else {
            finalTokens.push(tok);
        }
    }

    return finalTokens;
}

const renderTokenList = (
    tokens: InlineToken[],
    handleOpenUrl: (url: string) => void
) =>
    tokens.map((token, index) => {
        switch (token.type) {
            case 'bold':
                return <Text key={index} style={styles.bold}>{token.value}</Text>;
            case 'italic':
                return <Text key={index} style={styles.italic}>{token.value}</Text>;
            case 'strike':
                return <Text key={index} style={styles.strike}>{token.value}</Text>;
            case 'code':
                return <Text key={index} style={styles.inlineCode}>{` ${token.value} `}</Text>;
            case 'url':
                return (
                    <Text key={index} style={styles.url} onPress={() => token.url && handleOpenUrl(token.url)}>
                        {token.value}
                    </Text>
                );
            case 'email':
            case 'phone':
                return (
                    <Text key={index} style={styles.entityLink} onPress={() => token.url && handleOpenUrl(token.url)}>
                        {token.value}
                    </Text>
                );
            case 'mention':
                return <Text key={index} style={styles.mention}>{token.value}</Text>;
            case 'highlight':
                return <Text key={index} style={styles.highlight}>{token.value}</Text>;
            case 'text':
            default:
                return <React.Fragment key={index}>{token.value}</React.Fragment>;
        }
    });

export const FormattedText: React.FC<FormattedTextProps> = ({
    content,
    color = colors.neutral900,
    size = 15,
    searchHighlight,
    style,
}) => {
    const safeContent = content || "";

    const codeBlockMatch = useMemo(() => {
        const match = safeContent.match(/^```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```$/);
        return match ? match[1] : null;
    }, [safeContent]);

    const hasBlockquote = useMemo(
        () => codeBlockMatch === null && safeContent.split('\n').some(l => l.startsWith('>')),
        [safeContent, codeBlockMatch]
    );

    const tokens = useMemo(
        () => (codeBlockMatch !== null || hasBlockquote ? [] : parseInline(safeContent, searchHighlight)),
        [safeContent, searchHighlight, codeBlockMatch, hasBlockquote]
    );

    const handleOpenUrl = (url: string) => {
        Linking.canOpenURL(url).then(supported => {
            if (supported) Linking.openURL(url).catch(() => {});
        }).catch(() => {});
    };

    if (codeBlockMatch !== null) {
        return (
            <View style={styles.codeBlockContainer}>
                <Text style={styles.codeBlockText} selectable>
                    {codeBlockMatch}
                </Text>
            </View>
        );
    }

    const baseTextStyle: TextStyle = {
        fontSize: verticalScale(size),
        color,
        lineHeight: verticalScale(size * 1.35),
    };

    if (hasBlockquote) {
        const lines = safeContent.split('\n');
        return (
            <View style={{ gap: verticalScale(4) }}>
                {lines.map((line, lineIdx) => {
                    const isQuote = line.startsWith('>');
                    const cleanLine = isQuote ? line.replace(/^>\s?/, '') : line;
                    const lineTokens = parseInline(cleanLine, searchHighlight);
                    if (isQuote) {
                        return (
                            <View key={lineIdx} style={styles.blockquote}>
                                <View style={styles.blockquoteBar} />
                                <Text style={[baseTextStyle, style, { flex: 1, fontStyle: 'italic' }]}>
                                    {renderTokenList(lineTokens, handleOpenUrl)}
                                </Text>
                            </View>
                        );
                    }
                    return (
                        <Text key={lineIdx} style={[baseTextStyle, style]}>
                            {renderTokenList(lineTokens, handleOpenUrl)}
                        </Text>
                    );
                })}
            </View>
        );
    }

    return (
        <Text style={[baseTextStyle, style]}>
            {renderTokenList(tokens, handleOpenUrl)}
        </Text>
    );
};

const styles = StyleSheet.create({
    bold: {
        fontWeight: '700',
    },
    italic: {
        fontStyle: 'italic',
    },
    strike: {
        textDecorationLine: 'line-through',
    },
    inlineCode: {
        fontFamily: 'monospace',
        backgroundColor: 'rgba(0,0,0,0.07)',
        borderRadius: radius._5,
        fontSize: verticalScale(13.5),
        paddingHorizontal: spacingX._4,
    },
    url: {
        color: '#2563eb',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    entityLink: {
        color: '#b45309',
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    mention: {
        color: '#d97706',
        fontWeight: '700',
        backgroundColor: 'rgba(245,158,11,0.14)',
    },
    blockquote: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: 'rgba(245,158,11,0.09)',
        borderRadius: radius._8,
        paddingVertical: spacingY._5,
        paddingRight: spacingX._8,
        overflow: 'hidden',
    },
    blockquoteBar: {
        width: 3,
        backgroundColor: colors.primaryDark,
        marginRight: spacingX._8,
    },
    highlight: {
        backgroundColor: '#fde047',
        color: colors.neutral900,
        fontWeight: '600',
        borderRadius: radius._3,
    },
    codeBlockContainer: {
        backgroundColor: '#1e293b',
        borderRadius: radius._10,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._10,
        marginVertical: spacingY._4,
    },
    codeBlockText: {
        fontFamily: 'monospace',
        fontSize: verticalScale(13),
        color: '#f8fafc',
        lineHeight: verticalScale(18),
    },
});

export default FormattedText;
