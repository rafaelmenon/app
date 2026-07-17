import { MetaTemplate } from "@/types";
import api from "./api";

export const metaTemplateService = {
  async listTemplates(connectionId: string): Promise<MetaTemplate[]> {
    const response = await api.get(`/meta-templates/${connectionId}`);
    return response.data.templates || [];
  },

  async sendTemplate(
    ticketId: string,
    templateName: string,
    language: string,
    variables?: string[],
    messageContent?: string,
    headerMedia?: { type: string; url: string; filename?: string },
  ): Promise<void> {
    await api.post(`/meta-templates/send/${ticketId}`, {
      templateName,
      language,
      variables,
      messageContent,
      headerMedia,
    });
  },

  async uploadMedia(
    connectionId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    mediaFormat: "IMAGE" | "VIDEO" | "DOCUMENT",
  ): Promise<{
    mediaHandle: string;
    s3Url: string;
    s3Key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    formData.append("mediaFormat", mediaFormat);

    const response = await api.post(
      `/meta-templates/${connectionId}/upload-media`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  extractVariables(template: MetaTemplate): number {
    const bodyComponent = template.components?.find((c) => c.type === "BODY");
    if (!bodyComponent?.text) return 0;

    const matches = bodyComponent.text.match(/\{\{(\d+)\}\}/g);
    return matches ? matches.length : 0;
  },

  getBodyText(template: MetaTemplate): string {
    const bodyComponent = template.components?.find((c) => c.type === "BODY");
    return bodyComponent?.text || "";
  },

  getHeaderText(template: MetaTemplate): string {
    const headerComponent = template.components?.find(
      (c) => c.type === "HEADER",
    );
    return headerComponent?.text || "";
  },

  getFooterText(template: MetaTemplate): string {
    const footerComponent = template.components?.find(
      (c) => c.type === "FOOTER",
    );
    return footerComponent?.text || "";
  },

  hasMediaHeader(template: MetaTemplate): boolean {
    const headerComponent = template.components?.find(
      (c) => c.type === "HEADER",
    );
    if (!headerComponent?.format) return false;
    return ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format);
  },

  getHeaderFormat(template: MetaTemplate): string | null {
    const headerComponent = template.components?.find(
      (c) => c.type === "HEADER",
    );
    return headerComponent?.format || null;
  },
};
