import { createSubjectMessagesSupabaseRepository } from "./subject-messages-supabase.js";
import { toTimelineRows } from "./subject-timeline-merge.js";

function normalizeId(value) {
  return String(value || "").trim();
}

export function createSubjectMessagesService({ repository } = {}) {
  const provider = repository || createSubjectMessagesSupabaseRepository();

  async function listMessages(subjectId) {
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId) return [];
    return provider.listMessages({ subjectId: normalizedSubjectId });
  }

  async function listTimeline(subjectId) {
    const normalizedSubjectId = normalizeId(subjectId);
    if (!normalizedSubjectId) return { rows: [], messages: [], events: [], businessEvents: [], conversation: null };

    const [messages, events, businessEvents, conversation] = await Promise.all([
      provider.listMessages({ subjectId: normalizedSubjectId }),
      provider.listEvents({ subjectId: normalizedSubjectId }),
      provider.listBusinessEvents({ subjectId: normalizedSubjectId }),
      provider.getConversationSettings({ subjectId: normalizedSubjectId })
    ]);

    return {
      rows: toTimelineRows(messages, events, businessEvents),
      messages,
      events,
      businessEvents,
      conversation
    };
  }

  async function createMessage(payload = {}) {
    return provider.createMessage(payload);
  }

  async function createReply(payload = {}) {
    return provider.createMessage({
      ...payload,
      parentMessageId: normalizeId(payload.parentMessageId)
    });
  }

  async function markMessageRead(messageId, context = {}) {
    return provider.markMessageRead({ messageId, ...context });
  }

  async function markTimelineRead(subjectId) {
    const messages = await listMessages(subjectId);
    for (const message of messages) {
      const messageId = normalizeId(message?.id);
      if (!messageId) continue;
      await provider.markMessageRead({
        messageId,
        subjectId,
        projectId: message?.project_id
      });
    }
    return true;
  }

  async function canEditMessage(messageId) {
    return provider.canEditMessage({ messageId });
  }

  async function editMessage(messageIdOrPayload, patch = {}) {
    if (messageIdOrPayload && typeof messageIdOrPayload === "object" && !Array.isArray(messageIdOrPayload)) {
      return provider.editMessage({
        messageId: messageIdOrPayload.messageId,
        subjectId: messageIdOrPayload.subjectId,
        bodyMarkdown: messageIdOrPayload.bodyMarkdown,
        uploadSessionId: messageIdOrPayload.uploadSessionId
      });
    }
    return provider.editMessage({
      messageId: messageIdOrPayload,
      bodyMarkdown: patch.bodyMarkdown,
      subjectId: patch.subjectId,
      uploadSessionId: patch.uploadSessionId
    });
  }

  async function deleteMessage(messageId) {
    return provider.deleteMessage({ messageId });
  }

  async function toggleMessageReaction(messageId, reactionCode) {
    return provider.toggleMessageReaction({ messageId, reactionCode });
  }

  async function uploadTemporaryAttachment(payload = {}) {
    return provider.uploadTemporaryAttachment(payload);
  }

  async function uploadAttachmentFile(payload = {}) {
    return provider.uploadAttachmentFile(payload);
  }

  async function linkAttachmentsToMessage(payload = {}) {
    return provider.linkAttachmentsToMessage(payload);
  }

  async function removeTemporaryAttachment(payload = {}) {
    return provider.removeTemporaryAttachment(payload);
  }

  async function lockConversation(subjectId, options = {}) {
    return provider.lockConversation({ subjectId, reason: options.reason });
  }

  async function unlockConversation(subjectId) {
    return provider.unlockConversation({ subjectId });
  }

  async function listCollaboratorsForMentions(projectIdOrOptions = "") {
    if (projectIdOrOptions && typeof projectIdOrOptions === "object" && !Array.isArray(projectIdOrOptions)) {
      return provider.listCollaboratorsForMentions({
        projectId: projectIdOrOptions.projectId
      });
    }
    return provider.listCollaboratorsForMentions({ projectId: projectIdOrOptions });
  }

  async function getOrCreateMdallPerson() {
    if (typeof provider.getOrCreateMdallPerson !== "function") return null;
    return provider.getOrCreateMdallPerson();
  }

  async function listUnreadConversationNotifications(context = {}) {
    return provider.listUnreadConversationNotifications(context);
  }

  return {
    listTimeline,
    listMessages,
    createMessage,
    createReply,
    markMessageRead,
    markTimelineRead,
    canEditMessage,
    editMessage,
    deleteMessage,
    toggleMessageReaction,
    uploadTemporaryAttachment,
    uploadAttachmentFile,
    linkAttachmentsToMessage,
    removeTemporaryAttachment,
    lockConversation,
    unlockConversation,
    listCollaboratorsForMentions,
    getOrCreateMdallPerson,
    listUnreadConversationNotifications
  };
}

export const subjectMessagesService = createSubjectMessagesService();
