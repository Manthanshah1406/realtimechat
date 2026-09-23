import { useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/client';

export default function MessageInput({ onSend, conversationId }) {
  const { socket }    = useSocket();
  const [text, setText]           = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(null); // { name, url, isImage }
  const typingRef      = useRef(false);
  const typingTimerRef = useRef(null);
  const fileInputRef   = useRef(null);

  const emitTypingStop = () => {
    if (typingRef.current) {
      socket?.emit('typing:stop', { conversationId });
      typingRef.current = false;
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    if (!typingRef.current) {
      socket?.emit('typing:start', { conversationId });
      typingRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(emitTypingStop, 2000);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !preview) return;
    onSend(trimmed, preview?.url || null);
    setText('');
    setPreview(null);
    emitTypingStop();
    clearTimeout(typingTimerRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const isImage = file.type.startsWith('image/');
      setPreview({ name: file.name, url: data.url, isImage });
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const hasContent = text.trim() || preview;

  return (
    <div className="px-4 py-3 border-t bg-white flex-shrink-0">

      {/* Attachment preview */}
      {preview && (
        <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200
          rounded-xl px-3 py-2">
          {preview.isImage ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center
              justify-center flex-shrink-0 text-brand-600 text-lg">
              📄
            </div>
          )}
          <p className="text-xs text-gray-600 truncate flex-1">{preview.name}</p>
          <button
            onClick={() => setPreview(null)}
            className="text-gray-400 hover:text-red-500 transition text-sm flex-shrink-0"
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Attach file"
        />

        {/* Paperclip button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition disabled:opacity-50"
          aria-label="Attach file"
          title="Attach file"
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19
                a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          )}
        </button>

        {/* Text input */}
        <textarea
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={preview ? 'Add a caption…' : 'Type a message…'}
          className="flex-1 resize-none border-2 border-gray-400 rounded-2xl px-4 py-2.5
            text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100
            bg-gray-50 focus:bg-white placeholder-gray-400 transition max-h-32"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!hasContent}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75
              0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519
              0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0
              003.478 2.405z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
