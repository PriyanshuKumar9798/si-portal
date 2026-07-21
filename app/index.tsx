// Redirect root → either the SI list (authed) or login (not authed). The
// (app)/_layout auth guard handles the second half; we just route into the
// group so the guard fires.

import { Redirect } from 'expo-router';

export default function IndexRedirect() {
  return <Redirect href="/sis" />;
}
