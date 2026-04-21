export function toTimelineRows(messages = [], events = [], businessEvents = []) {
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
