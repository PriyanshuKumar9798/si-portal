// Icon set — thin re-export layer over `lucide-react-native` so every screen
// pulls icons from a single, consistent place. Lucide gives us ~1400 icons,
// tree-shakes on web, and matches the icon language used in BS FA. Names
// below are stable aliases (Icon{PascalName}) so call sites don't churn
// when we swap the underlying package.

import {
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lightbulb,
  FileX,
  AlertCircle,
  User,
  Clock,
  Save,
  Lock,
  LockOpen,
  Download,
  RefreshCw,
  X,
  Info,
  Search,
  Filter as FilterIcon,
  Check,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react-native';

// Every screen imports via these aliases. Direct lucide names would break
// if we ever swap the icon set.
export const IconTrash          = Trash2;
export const IconCalendar       = Calendar;
export const IconChevronDown    = ChevronDown;
export const IconChevronUp      = ChevronUp;
export const IconChevronRight   = ChevronRight;
export const IconPlus           = Plus;
export const IconBulb           = Lightbulb;
export const IconFileEmpty      = FileX;
export const IconAlert          = AlertCircle;
export const IconUser           = User;
export const IconClock          = Clock;

// New icons for the button audit — Save (dirty-state Save all), Lock (finalise
// SI), Unlock (rare — showing a locked SI's status), Download (CSV exports),
// RefreshCw (Retry / regenerate), X (close), Info (tooltip trigger), Search
// (multi-select filter), Filter, Check (confirmation state), ArrowLeft (back),
// FileText (line items catalogue), AlertTriangle (destructive warning).
export const IconSave           = Save;
export const IconLock           = Lock;
export const IconUnlock         = LockOpen;
export const IconDownload       = Download;
export const IconRefresh        = RefreshCw;
export const IconClose          = X;
export const IconInfo           = Info;
export const IconSearch         = Search;
export const IconFilter         = FilterIcon;
export const IconCheck          = Check;
export const IconArrowLeft      = ArrowLeft;
export const IconFileText       = FileText;
export const IconAlertTriangle  = AlertTriangle;
export const IconSun            = Sun;
export const IconMoon           = Moon;
export const IconChevronLeft    = ChevronLeft;
