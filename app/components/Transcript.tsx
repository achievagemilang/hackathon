'use client';

import type { Message } from '@/types';
import { useEffect, useRef } from 'react';

interface Props {
  history: Message[];
}

export default function Transcript({ history }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) {
    return null;
  }

  return (
    <div className='w-full max-w-2xl'>
      <h3 className='text-sm font-mono text-zinc-400 uppercase tracking-wider mb-4'>
        Conversation
      </h3>
      <div className='flex flex-col gap-3 max-h-80 overflow-y-auto pr-2'>
        {history
          .filter((m) => m.role !== 'system')
          .map((message, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-accent/10 text-zinc-200 rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-300 rounded-bl-sm'
                }`}
              >
                <span className='text-[10px] uppercase tracking-wider text-zinc-500 block mb-1'>
                  {message.role === 'user' ? 'You' : 'Reflect'}
                </span>
                {message.content}
              </div>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
