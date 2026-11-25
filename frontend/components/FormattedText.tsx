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
    type: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'url' | 'highlight';
    value: string;
    url?: string;
};

/**
 * WhatsApp-style inline tokenizer:
 * Supports *bold*, _italic_, ~strikethrough~, `code`, and URLs.
 */
function parseInline(text: string, highlight?: string): InlineToken[] {
    if (!text) return [];

    // Step 1: Tokenize URLs and search highlights first
    const tokens: InlineToken[] = [];
    
    // Regular expression matching URLs, code blocks, bold, italic, strike, and optional highlight
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    
    // Simple segmented parser
    const segments = text.split('\n');
    const resultTokens: InlineToken[] = [];

    // If search highlight is present, split and mark
    const highlightRegex = highlight?.trim()
        ? new RegExp(`(${highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        : null;

    // Helper to process inline styles: *bold*, _italic_, ~strike~, `code`
    const parseFormatting = (input: string) => {
        // Regex for *bold*, _italic_, ~strike~, `code`
        const formatRegex = /(\*[^\s*](?:[^*]*[^\s*])?\*|_[^\s_](?:[^_]*[^\s_])?_|~[^\s~](?:[^~]*[^\s~])?~|`[^`\n]+`)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = formatRegex.exec(input)) !== null) {
            if (match.index > lastIndex) {
                const plain = input.slice(lastIndex, match.index);
                resultTokens.push({ type: 'text', value: plain });
            }

            const raw = match[0];
            if (raw.startsWith('*') && raw.endsWith('*')) {
                resultTokens.push({ type: 'bold', value: raw.slice(1, -1) });
            } else if (raw.startsWith('_') && raw.endsWith('_')) {
                resultTokens.push({ type: 'italic', value: raw.slice(1, -1) });
            } else if (raw.startsWith('~') && raw.endsWith('~')) {
                resultTokens.push({ type: 'strike', value: raw.slice(1, -1) });
            } else if (raw.startsWith('`') && raw.endsWith('`')) {
                resultTokens.push({ type: 'code', value: raw.slice(1, -1) });
            } else {
                resultTokens.push({ type: 'text', value: raw });
            }

            lastIndex = match.index + raw.length;
        }

        if (lastIndex < input.length) {
            resultTokens.push({ type: 'text', value: input.slice(lastIndex) });
        }
    };

    // Helper to parse URLs
    const parseUrlsAndFormatting = (input: string) => {
        let lastIdx = 0;
        let match: RegExpExecArray | null;

        while ((match = urlRegex.exec(input)) !== null) {
            if (match.index > lastIdx) {
                parseFormatting(input.slice(lastIdx, match.index));
            }
            const rawUrl = match[0];
            const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
            resultTokens.push({ type: 'url', value: rawUrl, url: fullUrl });
            lastIdx = match.index + rawUrl.length;
        }

        if (lastIdx < input.length) {
            parseFormatting(input.slice(lastIdx));
        }
    };

    // If search highlight exists, apply highlight layer
    if (highlightRegex && highlight?.trim()) {
        const matchTestRegex = new RegExp(`^${highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const parts = text.split(highlightRegex);
        parts.forEach(part => {
            if (!part) return;
            if (matchTestRegex.test(part)) {
                resultTokens.push({ type: 'highlight', value: part });
            } else {
                parseUrlsAndFormatting(part);
            }
        });
    } else {
        parseUrlsAndFormatting(text);
    }

    return resultTokens;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
    content,
    color = colors.neutral900,
    size = 15,
    searchHighlight,
    style,
}) => {
    // Check for fenced code block ```code```
    const codeBlockMatch = useMemo(() => {
        const match = content.match(/^```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```$/);
        return match ? match[1] : null;
    }, [content]);

    const tokens = useMemo(
        () => (codeBlockMatch !== null ? [] : parseInline(content, searchHighlight)),
        [content, searchHighlight, codeBlockMatch]
    );

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

    const handleOpenUrl = (url: string) => {
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            }
        }).catch(() => {});
    };

    return (
        <Text style={[baseTextStyle, style]}>
            {tokens.map((token, index) => {
                switch (token.type) {
                    case 'bold':
                        return (
                            <Text key={index} style={styles.bold}>
                                {token.value}
                            </Text>
                        );
                    case 'italic':
                        return (
                            <Text key={index} style={styles.italic}>
                                {token.value}
                            </Text>
                        );
                    case 'strike':
                        return (
                            <Text key={index} style={styles.strike}>
                                {token.value}
                            </Text>
                        );
                    case 'code':
                        return (
                            <Text key={index} style={styles.inlineCode}>
                                {` ${token.value} `}
                            </Text>
                        );
                    case 'url':
                        return (
                            <Text
                                key={index}
                                style={styles.url}
                                onPress={() => token.url && handleOpenUrl(token.url)}
                            >
                                {token.value}
                            </Text>
                        );
                    case 'highlight':
                        return (
                            <Text key={index} style={styles.highlight}>
                                {token.value}
                            </Text>
                        );
                    case 'text':
                    default:
                        return <React.Fragment key={index}>{token.value}</React.Fragment>;
                }
            })}
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
