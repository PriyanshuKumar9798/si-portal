// usePageTitle — sets `document.title` for each route on web. Expo-router's
// Stack.Screen `title` option only affects the native-nav title, not the HTML
// document title, so browser tabs stay stuck on whatever the initial route
// applied. This hook fixes that: every screen calls it with its own title
// and the tab updates as the user navigates.
//
// A stable suffix (" · Burger Singh") is appended so the tab reads well
// truncated: "SI Portal · …", "Support · …", etc.

import { useEffect } from 'react';
import { Platform } from 'react-native';

const SUFFIX = ' · Burger Singh';

export function usePageTitle(title: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const previous = document.title;
    document.title = title + SUFFIX;
    return () => {
      // Restore on unmount so a slow route transition doesn't leave the wrong
      // title hanging.
      document.title = previous;
    };
  }, [title]);
}
