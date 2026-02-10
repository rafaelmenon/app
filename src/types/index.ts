export interface User {
  id: string
  name: string
  email: string
  type: 'USER' | 'ADMIN' | 'SUPER' | 'SUPERVISOR'
  companyId: string
  showTicketsWithoutQueue: boolean
  canViewCampaigns: boolean
  canAccessAdminMenu: boolean
  hasSeenTour: boolean
  skipTour: boolean
  createdAt: string
  updatedAt: string
  company: {
    id: string
    name: string
    email: string
    accessAllowedUntilPayment?: boolean
    lastOverdueDate?: string | null
    graceperiodEndDate?: string | null
    createdAt: string
  }
  queues?: {
    id: string
    userId: string
    queueId: string
    queue: {
      id: string
      name: string
      color: string
    }
  }[]
  connections?: {
    id: string
    userId: string
    connectionId: string
    connection: {
      id: string
      name: string
      color: string
      evolutionName: string
      status: string
    }
  }[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export type TicketStatus = 'OPEN' | 'PENDING' | 'CLOSED'

export interface Queue {
  id: string
  name: string
  color: string
}

export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'SYSTEM'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ'

export interface Message {
  id: string
  content: string
  type: MessageType
  fromMe: boolean
  status?: MessageStatus
  ticketId: string
  contactId: string
  queueId: string | null
  connectionId: string
  companyId: string
  mediaUrl: string | null
  mediaType: string | null
  mediaSize: number | null
  fileName: string | null
  evolutionId: string | null
  timestamp: string
  createdAt: string
  updatedAt: string
  isEdited?: boolean
  originalContent?: string
  editedAt?: string
  isDeleted?: boolean
  deletedAt?: string
  quotedMessageId?: string | null
  quotedContent?: string | null
  isWhisper?: boolean
}

export interface Ticket {
  id: string
  status: TicketStatus
  contactId: string
  queueId: string | null
  userId: string | null
  connectionId: string
  companyId: string
  isGroup: boolean
  groupId: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageType: string | null
  lastMessageFromMe: boolean | null
  hasUnreadMessages: boolean
  unreadCount: number
  isInBotFlow: boolean
  createdAt: string
  updatedAt: string
  contact: {
    id: string
    name: string
    phone: string
    countryCode: string
    isValidated: boolean
    isMuted: boolean
    disableClosingMessage?: boolean
    profilePicture: string | null
  }
  queue?: {
    id: string
    name: string
    color: string
  } | null
  user?: {
    id: string
    name: string
    email: string
  } | null
  connection: {
    id: string
    name: string
    color: string
    evolutionName: string
    status: string
    enableRatingMessage?: boolean
  }
  tags?: {
    id: string
    name: string
    color: string
  }[]
}
