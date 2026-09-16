import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Shield, Smile } from "lucide-react";
import { ChatMessageItem, SocketUser } from "@/hooks/useRoomSocket";

interface ChatPanelProps {
  messages: ChatMessageItem[];
  currentUser: SocketUser;
  isHost: boolean;
  onSendMessage: (content: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_REACTIONS = ["❤️", "😂", "🔥", "👏", "😱", "🍿", "👀", "🎉"];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUser,
  isHost,
  onSendMessage,
  onDeleteMessage,
  onSendReaction,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#11141c]">
      {/* Messages Scroll Area */}
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
            <Smile size={32} className="mb-2 text-neutral-600" />
            <p className="text-xs font-semibold">No messages yet</p>
            <p className="mt-0.5 text-[10px]">Say hello or react to get the conversation going!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser.id;
            const isSystem = msg.messageType === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <span className="rounded-full border border-white/5 bg-white/[.03] px-3 py-1 text-[9px] font-semibold text-neutral-400">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const initials = msg.senderName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            const canDelete = isOwn || isHost;

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-black"
                  style={{ backgroundColor: msg.senderColor || "#D6FF3F" }}
                >
                  {initials}
                </div>

                {/* Message Body */}
                <div className={`max-w-[75%] ${isOwn ? "items-end text-right" : ""}`}>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-neutral-300">{msg.senderName}</span>
                    <span className="text-[8px] text-neutral-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 transition group-hover:opacity-100 text-neutral-500 hover:text-red-400 ml-1"
                        title={isHost && !isOwn ? "Delete as host" : "Delete message"}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  <div
                    className={`mt-1 inline-block rounded-2xl px-3 py-2 text-[11px] leading-relaxed break-words text-left ${
                      isOwn
                        ? "bg-[#d6ff3f]/15 text-[#e5f5ba] border border-[#d6ff3f]/20"
                        : "bg-white/[.05] text-neutral-200 border border-white/[.07]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="flex items-center gap-1 border-t border-white/[.06] bg-[#0c0e14] px-3 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 mr-1">
          React
        </span>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="btn-press rounded-md px-1.5 py-0.5 text-xs hover:bg-white/10"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/[.08] bg-[#0e1017] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-white/[.1] bg-white/[.03] p-1.5 focus-within:border-[#d6ff3f]/40">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="min-h-[32px] max-h-24 flex-1 resize-none bg-transparent px-2 py-1 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="btn-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d6ff3f] text-black disabled:opacity-40 hover:bg-[#e1ff70]"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
