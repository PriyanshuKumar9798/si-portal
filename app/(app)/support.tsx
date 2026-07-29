// Support — root route. Two sub-pages that share the /support URL:
//   • list   — the "My Area" landing
//   • detail — a specific ticket's thread, opened via ?t=<id>
//
// The "Add ticket" flow lives on its own /add-ticket route (see
// app/(app)/add-ticket.tsx) so browser-back and the breadcrumb both land on
// the Support home naturally, and the unsaved-changes guard runs through the
// standard router-based navigation path.

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyArea } from '../../src/support/MyArea';
import { TicketDetail } from '../../src/support/TicketDetail';
import type { Reply } from '../../src/support/model';
import { useTicketStore } from '../../src/support/TicketStore';
import { useToast } from '../../src/components/Toast';
import { usePageTitle } from '../../src/hooks/usePageTitle';

type Page = 'list' | 'detail';

export default function SupportRoute() {
  const { show } = useToast();
  const router = useRouter();
  const { tickets, patch, addReply, setStatus } = useTicketStore();
  const params = useLocalSearchParams<{ t?: string }>();

  // Deep-link support: /support?t=<id> opens that ticket's detail on first
  // render. Lazy `useState` initializer so a browser refresh lands directly
  // on the detail page without a flash of the list.
  const [page, setPage] = useState<Page>(() =>
    typeof params.t === 'string' && params.t ? 'detail' : 'list',
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof params.t === 'string' && params.t ? params.t : null,
  );
  const active = tickets.find((t) => t.id === activeId) ?? null;

  const openTicket = (id: string) => { setActiveId(id); setPage('detail'); };
  const goList = () => { setPage('list'); setActiveId(null); };
  const goAdd = () => router.push('/add-ticket' as never);

  usePageTitle(
    page === 'detail' ? (active ? `Ticket #${active.id}` : 'Support') : 'Support'
  );

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
      onNew={goAdd}
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
