// Add-ticket — the compose form as its own real route so browser-back and the
// breadcrumb both land on the Support home naturally. Previously this lived
// as an in-route sub-page inside /support with local state, which made the
// back button ambiguous (Support home vs. wherever the user came from).
//
// The form component itself (`NewTicket`) is unchanged — this file just wires
// it to router-based navigation and the shared ticket store.

import { useRouter } from 'expo-router';
import { NewTicket } from '../../src/support/NewTicket';
import { useTicketStore } from '../../src/support/TicketStore';
import { useToast } from '../../src/components/Toast';
import { usePageTitle } from '../../src/hooks/usePageTitle';

export default function AddTicketRoute() {
  usePageTitle('Submit a ticket');
  const router = useRouter();
  const { show } = useToast();
  const { add } = useTicketStore();

  const goSupport = () => router.push('/support' as never);

  return (
    <NewTicket
      onCancel={goSupport}
      onCreate={(t) => {
        add(t);
        show(`Ticket #${t.id} submitted`, { tone: 'success' });
        // Land on the ticket's own detail page after submit.
        router.replace(`/support?t=${encodeURIComponent(t.id)}` as never);
      }}
    />
  );
}
