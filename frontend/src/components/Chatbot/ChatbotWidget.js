import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { API_BASE_URL } from "../../config/runtimeUrls";
import "./ChatbotWidget.css";

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello. Ask me anything about our rooms, services, or bookings.",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    const openChatbot = () => {
      const token = localStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
        setIsOpen(true);
      }
    };

    window.addEventListener("cityscape:open-chatbot", openChatbot);
    return () => window.removeEventListener("cityscape:open-chatbot", openChatbot);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: inputValue })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = {
        id: messages.length + 2,
        text: data.reply,
        sender: "bot",
        timestamp: new Date(data.timestamp)
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoggedIn && (
        <>
          <button
            className="chatbot-bubble"
            onClick={() => setIsOpen(!isOpen)}
            title="Chat with Cityscape"
            aria-label={isOpen ? "Close chat" : "Open chat"}
          >
            {isOpen ? <X size={22} strokeWidth={2} /> : <MessageCircle size={24} strokeWidth={1.9} />}
          </button>

          {isOpen && (
            <div className="chatbot-widget">
              <div className="chatbot-header">
                <h3>Cityscape Hotel Assistant</h3>
                <button
                  className="close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="chatbot-messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message message-${message.sender}`}
                  >
                    <div className="message-content">
                      {message.text}
                    </div>
                    <small className="message-time">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </small>
                  </div>
                ))}
                {isLoading && (
                  <div className="message message-bot">
                    <div className="message-content typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="chatbot-form">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Ask me something..."
                  disabled={isLoading}
                  className="chatbot-input"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="send-btn"
                  aria-label="Send message"
                >
                  <Send size={16} strokeWidth={2} />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ChatbotWidget;
