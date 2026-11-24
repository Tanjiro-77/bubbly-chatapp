export interface SelectedFileProps {
  uri?: string;
  name: string;
  mimeType: string;
  size: number;
  isImage: boolean;
}

export interface UserProps {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  avatar?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface DecodedTokenProps {
  user: UserProps;
  exp: number;
  iat: number;
}

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
  | "announcement";

export interface AttachmentMetaProps {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  resourceType: "image" | "video" | "raw" | "audio";
}

export interface LocationMeta {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface CallMetaProps {
  callId: string;
  kind: "voice" | "video";
  status: "missed" | "rejected" | "ended" | "failed";
  duration: number;
}

export interface PollVoteProps {
  userId: string;
  userName: string;
}

export interface PollOptionProps {
  id: string;
  text: string;
  votes: PollVoteProps[];
}

export interface PollProps {
  question: string;
  options: PollOptionProps[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  endsAt?: string | null;
  isClosed: boolean;
}

export interface ReactionProps {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ReplyToProps {
  id: string;
  content: string;
  senderName: string;
  voiceUrl?: string | null;
  type?: string;
}

export interface MessageProps {
  id: string;
  _id?: string;
  content: string;
  sender: {
    id: string;
    _id?: string;
    name: string;
    avatar?: string | null;
  };
  createdAt: string;
  conversationId: string;
  type: MessageType;
  attachement?: string | null;
  attachmentMeta?: AttachmentMetaProps | null;
  location?: LocationMeta | null;
  voiceUrl?: string | null;
  voiceDuration?: number;
  callMeta?: CallMetaProps | null;
  poll?: PollProps | null;
  reactions: ReactionProps[];
  replyTo?: ReplyToProps | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  expiresAt?: string | null;
  isSaved?: boolean;
  isPinned?: boolean;
  isForwarded?: boolean;
  isViewOnce?: boolean;
  viewOnceOpenedBy?: string[];
  translatedText?: string;
}

export interface ConversationParticipant {
  _id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface ConversationProps {
  _id: string;
  type: "direct" | "group";
  avatar: string | null;
  name?: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    type: MessageType;
    attachement?: string;
    attachmentMeta?: AttachmentMetaProps;
    createdAt: string;
    voiceUrl?: string;
    voiceDuration?: number;
    isDeleted?: boolean;
    callMeta?: CallMetaProps | null;
    poll?: PollProps | null;
  };
  unreadCount?: number;
  isMuted?: boolean;
  mutedUntil?: string | null;
  pinnedMessages?: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    sender?: { id: string; name: string; avatar?: string | null } | null;
  }[];
  groupAdmins?: string[];
  createdAt: string;
  updatedAt: string;
}

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

export interface IncomingCallProps {
  callId: string;
  conversationId: string;
  kind: CallKind;
  caller: {
    id: string;
    name: string;
    avatar: string | null;
  };
  calleeId: string;
}

export interface ActiveCallProps {
  callId: string;
  channelName: string;
  kind: CallKind;
  remoteUser: {
    id: string;
    name: string;
    avatar: string | null;
  };
  isOutgoing: boolean;
  startedAt?: Date;
}

export type StoryType = "text" | "image" | "video";

export interface StoryViewerProps {
  userId: string;
  viewedAt: string;
}

export interface StoryReactionProps {
  emoji: string;
  userId: string;
  userName: string;
}

export interface StoryItemProps {
  _id: string;
  type: StoryType;
  text?: string;
  backgroundColor?: string;
  mediaUrl?: string;
  viewers: StoryViewerProps[];
  reactions: StoryReactionProps[];
  createdAt: string;
  expiresAt: string;
  seen: boolean;
}

export interface StoryGroupProps {
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  stories: StoryItemProps[];
  hasUnseen: boolean;
}

export interface ResponseProps {
  success: boolean;
  data?: any;
  msg?: string;
}
