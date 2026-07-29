// Support — root route. Switches between three sub-pages (list / detail / new)
// using local page state; ticket data itself lives in the app-wide
// TicketStoreProvider so status changes (Kanban drag, replies, new tickets)
// survive when the user navigates away and back.

import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MyArea } from '../../src/support/MyArea';
import { TicketDetail } from '../../src/support/TicketDetail';
import { NewTicket } from '../../src/support/NewTicket';
import type { Reply } from '../../src/support/model';
import { useTicketStore } from '../../src/support/TicketStore';
import { useToast } from '../../src/components/Toast';
import { usePageTitle } from '../../src/hooks/usePageTitle';

type Page = 'list' | 'new' | 'detail';

export default function SupportRoute() {
  const { show } = useToast();
  const { tickets, patch, add, addReply, setStatus } = useTicketStore();
  const params = useLocalSearchParams<{ new?: string; t?: string }>();
  const [page, setPage] = useState<Page>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = tickets.find((t) => t.id === activeId) ?? null;

  // Deep-link support: /support?new=1 opens the compose form,
  // /support?t=<id> opens that ticket's detail. Fires ONCE on mount so
  // manual navigation later doesn't get overridden by stale query params.
  useEffect(() => {
    if (params.new === '1') setPage('new');
    else if (typeof params.t === 'string' && params.t) {
      setActiveId(params.t);
      setPage('detail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTicket = (id: string) => { setActiveId(id); setPage('detail'); };
  const goList = () => { setPage('list'); setActiveId(null); };
  const goNew = () => { setPage('new'); setActiveId(null); };

  usePageTitle(
    page === 'new'    ? 'Submit a ticket' :
    page === 'detail' ? (active ? `Ticket #${active.id}` : 'Support') :
                        'Support'
  );

  if (page === 'new') {
    return (
      <NewTicket
        onCancel={goList}
        onCreate={(t) => {
          add(t);
          setActiveId(t.id);
          setPage('detail');
          show(`Ticket #${t.id} submitted`, { tone: 'success' });
        }}
      />
    );
  }

  if (page === 'detail' && active) {
    return (
      <TicketDetail
        ticket={active}
        onBack={goList}
        onReply={(r: Reply) => {
          const wasClosed = active.status === 'closed';
          addReply(active.id, r, { reopen: true });
          show(wasClosed ? 'Reply sent · ticket reopened' : 'Reply sent', { tone: 'success' });
        }}
        onComment={(r: Reply) => {
          addReply(active.id, r);
          show('Comment added', { tone: 'success' });
        }}
        onClose={() => {
          setStatus(active.id, 'closed');
          show('Ticket closed', { tone: 'success' });
        }}
        onPatchProperties={(p) => {
          patch(active.id, p);
          show('Ticket updated', { tone: 'success' });
        }}
      />
    );
  }

  return (
    <MyArea
      tickets={tickets}
      onOpen={openTicket}
      onNew={goNew}
      onMove={(id, nextStatus) => {
        const t = tickets.find((x) => x.id === id);
        if (!t || t.status === nextStatus) return;
        setStatus(id, nextStatus);
        const label = nextStatus === 'closed' ? 'Ticket closed' :
                      nextStatus === 'on-hold' ? 'Ticket put on hold' :
                                                 'Ticket reopened';
        show(label, { tone: 'success' });
      }}
    />
  );
}
