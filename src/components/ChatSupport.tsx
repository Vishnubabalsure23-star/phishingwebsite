import React from 'react';
import ChatBubbleWidget from './ChatBubbleWidget';

const ChatSupport: React.FC = () => {
  return (
    <div className="h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <ChatBubbleWidget embedded />
    </div>
  );
};

export default ChatSupport;
