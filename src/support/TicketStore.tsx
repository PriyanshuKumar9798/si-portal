// TicketStore — lifts Support tickets out of the /support route so state
// survives navigation. Without this, Kanban drag-and-drop, comments, and new
// tickets all evaporated the moment the user hopped to another module and
// came back — the /support route remounts and re-reads SEED.
//
// The store also feeds Home's live scorecards + recent-activity feed so those
// counts reflect the same tickets you see inside Support.
//
// Backend swap: replace useState with useQuery({queryKey: ['tickets']}) once
// /api/v1/tickets ships. The public API here (patch/add/reply) is a superset
// of what the real endpoints will need.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserTicket, UserStatus, Reply } from './model';
import { SEED } from './model';

interface TicketStoreValue {
  tickets: UserTicket[];
  patch: (id: string, changes: Partial<UserTicket>) => void;
  add: (t: UserTicket) => void;
  addReply: (id: string, r: Reply, opts?: { reopen?: boolean }) => void;
  setStatus: (id: string, next: UserStatus) => void;
}

const Ctx = createContext<TicketStoreValue | null>(null);

export function TicketStoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<UserTicket[]>(SEED);

  const patch = useCallback((id: string, changes: Partial<UserTicket>) => {
    setTickets((curr) => curr.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const add = useCallback((t: UserTicket) => {
    setTickets((curr) => [t, ...curr]);
  }, []);

  const addReply = useCallback((id: string, r: Reply, opts?: { reopen?: boolean }) => {
    setTickets((curr) => curr.map((t) => {
      if (t.id !== id) return t;
      const nextStatus: UserStatus = opts?.reopen && t.status === 'closed' ? 'open' : t.status;
      return { ...t, replies: [...t.replies, r], status: nextStatus, lastThreadAt: Date.now() };
    }));
  }, []);

  const setStatus = useCallback((id: string, next: UserStatus) => {
    setTickets((curr) => curr.map((t) => (
      t.id === id ? { ...t, status: next, lastThreadAt: Date.now() } : t
    )));
  }, []);

  const value = useMemo<TicketStoreValue>(
    () => ({ tickets, patch, add, addReply, setStatus }),
    [tickets, patch, add, addReply, setStatus],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTicketStore(): TicketStoreValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useTicketStore must be used inside <TicketStoreProvider>');
  }
  return v;
}
