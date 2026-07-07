import { QuickReply, QuickReplyGroup } from "@/types";
import api from "./api";

export const quickReplyService = {
  async listGroups(): Promise<QuickReplyGroup[]> {
    const response = await api.get("/quick-reply-groups");
    return response.data.groups;
  },

  async listQuickReplies(groupId?: string, search?: string): Promise<QuickReply[]> {
    const params = new URLSearchParams()
    if (groupId) params.append('groupId', groupId)
    if (search) params.append('search', search)
    
    const response = await api.get(`/quick-replies${params.toString() ? `?${params}` : ''}`)
    return response.data.quickReplies
  },
};
