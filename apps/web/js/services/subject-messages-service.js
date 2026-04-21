import { createSubjectMessagesSupabaseRepository } from "./subject-messages-supabase.js";

function normalizeId(value) {
  return String(value || "").trim();
}

function toTimelineRows(messages = [], events = [], businessEvents = []) {
  const messageRows = (Array.isArray(messages) ? messages : []).map((message) => ({
    kind: "message",
    created_at: message?.created_at || "",
    message
  }));
  const eventRows = (Array.isArray(events) ? events : []).map((event) => ({
    kind: "event",
    created_at: event?.created_at || "",
    event
  }));
  const businessRows = (Array.isArray(businessEvents) ? businessEvents : []).map((event) => ({
    kind: "business_event",
    created_at: event?.created_at || "",
    event
  }));

  return [...messageRows, ...eventRows, ...businessRows].sort((left, right) => {
    const lt = String(left?.created_at || "");
    const rt = String(right?.created_at || "");
    return lt.localeCompare(rt);
  });
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

  async function listCollaboratorsForMentions(projectId) {
    return provider.listCollaboratorsForMentions({ projectId });
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
    listUnreadConversationNotifications
  };
}

export const subjectMessagesService = createSubjectMessagesService();
