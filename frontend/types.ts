import { router } from "expo-router";
import { ReactNode } from "react";
import {
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

// ─────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────

export type TypoProps = {
  size?: number;
  color?: string;
  fontWeight?: TextStyle["fontWeight"];
  children: any | null;
  style?: TextStyle;
  textProps?: TextProps;
};

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

export interface UserProps {
  email?: string;
  name: string;
  avatar?: string | null;
  id?: string;
  phoneNumber?: string;
  googleId?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  customStatus?: {
    emoji?: string;
    text?: string;
    updatedAt?: string | null;
  };
}

export interface UserDataProps {
  name: string;
  email?: string;
  avatar?: any;
}

// ─────────────────────────────────────────────
// INPUT / UI
// ─────────────────────────────────────────────

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  inputRef?: React.RefObject<TextInput | null>;
}

export interface DecodedTokenProps {
  user: UserProps;
  exp: number;
  iat: number;
}

export type AuthContextProps = {
  token: string | null;
  user: UserProps | null;
  isLoading?: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<void>;

  signInWithPhone: (
    phoneNumber: string,
    password: string
  ) => Promise<void>;

  signInWithGoogle: (payload: {
    idToken?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }) => Promise<void>;

  updateUserPhone: (phoneNumber: string) => Promise<void>;

  signUp: (
    email: string,
    password: string,
    name: string,
    avatar?: string
  ) => Promise<void>;

  signUpWithPhone: (
    phoneNumber: string,
    password: string,
    name: string,
    avatar?: string
  ) => Promise<void>;

  signOut: () => Promise<void>;

  updateToken: (token: string) => Promise<void>;
};

export type ScreenWrapperProps = {
  style?: ViewStyle;
  children: React.ReactNode;
  isModal?: boolean;
  showPattern?: boolean;
  bgOpacity?: number;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content";
};

export type ResponseProps = {
  success: boolean;
  data?: any;
  msg?: string;
  page?: number;
  hasMore?: boolean;
  totalCount?: number;
};

export interface ButtonProps extends TouchableOpacityProps {
  style?: ViewStyle;
  onPress?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export type BackButtonProps = {
  style?: ViewStyle;
  color?: string;
  iconSize?: number;
};

export type AvatarProps = {
  size?: number;

  // undefined is allowed because UserProps.avatar is optional
  uri?: string | null;

  style?: ViewStyle;
  isGroup?: boolean;
};

export type HeaderProps = {
  title?: string;
  style?: ViewStyle;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

// ─────────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────────

export type ConversationListItemProps = {
  item: ConversationProps;
  showDivider: boolean;
  isGroup?: boolean;
  router: typeof router;
  isOnline?: boolean;
  typingUser?: string | null;
  draftText?: string | null;
  onLongPress?: (item: ConversationProps) => void;
};

export type ConversationProps = {
  _id: string;
  type: "direct" | "group";
  avatar: string | null;

  participants: {
    _id: string;
    name: string;
    avatar: string;
    email: string;
  }[];

  name?: string;

  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;

    type:
    | "text"
    | "image"
    | "file"
    | "voice"
    | "video"
    | "call"
    | "poll"
    | "checklist";

    attachement?: string;
    attachmentMeta?: AttachmentMetaProps;
    createdAt: string;
    voiceUrl?: string;
    voiceDuration?: number;
    isDeleted?: boolean;
    isSilent?: boolean;

    callMeta?: CallMetaProps | null;
    poll?: PollProps | null;
    checklist?: ChecklistProps | null;
  };

  unreadCount?: number;
  isMuted?: boolean;
  mutedUntil?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  admins?: any[];
  createdBy?: string;
  disappearingSeconds?: number;
  pinnedMessages?: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    sender?: { id: string; name: string; avatar?: string | null } | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

// ─────────────────────────────────────────────
// REPLY
// ─────────────────────────────────────────────

export type ReplyToProps = {
  id: string;
  content: string;
  senderName: string;
  voiceUrl?: string | null;
  type?: string;
};

// ─────────────────────────────────────────────
// REACTIONS
// ─────────────────────────────────────────────

export type ReactionProps = {
  emoji: string;
  userId: string;
  userName: string;
};

// ─────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────

export type AttachmentMetaProps = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  resourceType?:
  | "image"
  | "video"
  | "raw"
  | "audio";
  isHd?: boolean;
  isViewOnce?: boolean;
};

// Alias used by MessageProps
export type AttachmentMeta = AttachmentMetaProps;

// ─────────────────────────────────────────────
// SELECTED FILE
// ─────────────────────────────────────────────

export type SelectedFileProps = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  isImage: boolean;
};

// ─────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────

export type LocationMeta = {
  latitude: number;
  longitude: number;
  label?: string;
};

// ─────────────────────────────────────────────
// SYSTEM EVENT
// ─────────────────────────────────────────────

export type SystemEventMeta = {
  kind: string;
  actorId?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
};

// ─────────────────────────────────────────────
// MESSAGE TYPES
// ─────────────────────────────────────────────

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "file"
  | "location"
  | "system"
  | "call"
  | "poll"
  | "announcement"
  | "checklist";

// ─────────────────────────────────────────────
// CALL MESSAGE META
// ─────────────────────────────────────────────

export interface CallMetaProps {
  callId: string;
  kind: "voice" | "video";
  status:
  | "missed"
  | "rejected"
  | "ended"
  | "failed";
  duration: number;
}

// ─────────────────────────────────────────────
// POLL
// ─────────────────────────────────────────────

export type PollVoteProps = {
  userId: string;
  userName: string;
};

export type PollOptionProps = {
  id: string;
  text: string;
  votes: PollVoteProps[];
};

export type PollProps = {
  question: string;
  options: PollOptionProps[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  endsAt?: string | null;
  isClosed: boolean;
};

export type ChecklistItemProps = {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
};

export type ChecklistProps = {
  title: string;
  items: ChecklistItemProps[];
};

// ─────────────────────────────────────────────
// MESSAGE
// ─────────────────────────────────────────────

export interface MessageProps {
  id: string;

  content: string;

  sender: {
    id: string;
    name: string;
    avatar?: string | null;
  };

  createdAt: string;
  conversationId: string;

  type: MessageType;

  attachement?: string | null;

  attachmentMeta?: AttachmentMetaProps | null;

  location?: LocationMeta | null;

  systemEvent?: SystemEventMeta | null;

  voiceUrl?: string | null;

  voiceDuration?: number;

  callMeta?: CallMetaProps | null;

  poll?: PollProps | null;

  checklist?: ChecklistProps | null;

  reactions: ReactionProps[];

  replyTo?: ReplyToProps | null;

  isDeleted?: boolean;
  isEdited?: boolean;
  isSilent?: boolean;

  expiresAt?: string | null;

  storyId?: string | null;

  isSaved?: boolean;
  isPinned?: boolean;
  isForwarded?: boolean;
  isViewOnce?: boolean;
  viewOnceOpenedBy?: string[];
}

// ─────────────────────────────────────────────
// TYPING
// ─────────────────────────────────────────────

export type TypingPayload = {
  conversationId: string;
  senderId: string;
  senderName: string;
};

// ─────────────────────────────────────────────
// USER STATUS
// ─────────────────────────────────────────────

export type UserStatusPayload = {
  userId: string;
  isOnline: boolean;
  lastSeen: string | null;
};

// ─────────────────────────────────────────────
// CALL TYPES
// ─────────────────────────────────────────────

export type CallKind = "voice" | "video";

export type CallStatus =
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "rejected"
  | "missed"
  | "failed"
  | "cancelled";

export type IncomingCallProps = {
  callId: string;
  conversationId: string;
  kind: CallKind;

  caller: {
    id: string;
    name: string;
    avatar: string | null;
  };

  calleeId: string;
};

export type ActiveCallProps = {
  callId: string;
  channelName: string;
  kind: CallKind;

  remoteUser: {
    id: string;
    name: string;
    avatar: string | null;
  };

  isOutgoing: boolean;
};

// ─────────────────────────────────────────────
// STORY TYPES
// ─────────────────────────────────────────────

export type StoryType =
  | "text"
  | "image"
  | "video";

export type StoryViewerProps = {
  userId: string;
  viewedAt: string;
};

export type StoryReactionProps = {
  emoji: string;
  userId: string;
  userName: string;
};

export type StoryItemProps = {
  _id: string;

  type: StoryType;

  text?: string;
  backgroundColor?: string;
  mediaUrl?: string;
  fontStyle?: string;
  sticker?: string;

  viewers: StoryViewerProps[];
  reactions: StoryReactionProps[];

  createdAt: string;
  expiresAt: string;
  seen: boolean;
};

export type StoryGroupProps = {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };

  stories: StoryItemProps[];

  hasUnseen: boolean;
};