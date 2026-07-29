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
  ArrowRight,
  FileText,
  AlertTriangle,
  Sun,
  Moon,
  Home as HomeIcon,
  LayoutDashboard,
  LifeBuoy,
  GraduationCap,
  Bell,
  Boxes,
  Send,
  Paperclip,
  MessageSquare,
  // Channels (Franchisee Support parity)
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Users as UsersIcon,
  // Twitter / Facebook / Instagram aren't exported by lucide-react-native —
  // fall back to a generic Globe glyph for those channels.
  Sandwich,
  Tag,
  // Categories
  Wrench,
  BarChart3,
  ShieldCheck,
  Monitor,
  Hammer,
  Megaphone,
  Package,
  ClipboardList,
  TrendingUp,
  Truck,
  Briefcase,
  Scale,
  CreditCard,
  Camera,
  Inbox,
  // Toolbar / editor / thread
  MoreHorizontal,
  ArrowUpDown,
  Edit3,
  Bold,
  Italic,
  Underline,
  List as ListIcon,
  LayoutGrid,
  Image as ImageIcon,
  Printer,
  ExternalLink,
  CheckCircle2,
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
export const IconArrowRight     = ArrowRight;
export const IconFileText       = FileText;
export const IconAlertTriangle  = AlertTriangle;
export const IconSun            = Sun;
export const IconMoon           = Moon;
export const IconChevronLeft    = ChevronLeft;

// App-shell nav icons — Home (root), LayoutDashboard (SI Portal tab, later
// swapped once we ship real Dashboards), LifeBuoy (Support), GraduationCap
// (Burger Singh Academy — placeholder), Bell (Central alerts — placeholder),
// Boxes / Send / Paperclip / MessageSquare are used by the Support screen.
export const IconHome           = HomeIcon;
export const IconLayoutDashboard = LayoutDashboard;
export const IconLifeBuoy       = LifeBuoy;
export const IconGraduationCap  = GraduationCap;
export const IconBell           = Bell;
export const IconBoxes          = Boxes;
export const IconSend           = Send;
export const IconPaperclip      = Paperclip;
export const IconMessageSquare  = MessageSquare;

// Channels
export const IconPhone          = Phone;
export const IconMail           = Mail;
export const IconGlobe          = Globe;
// Brand-icon fallbacks — lucide-react-native ships without Twitter/Facebook/
// Instagram. A generic Globe reads as "social" without the missing glyph.
export const IconTwitter        = Globe;
export const IconFacebook       = Globe;
export const IconInstagram      = Globe;
export const IconMessageCircle  = MessageCircle;
export const IconUsers          = UsersIcon;
export const IconSandwich       = Sandwich;
export const IconTag            = Tag;

// Category icons
export const IconWrench         = Wrench;
export const IconBarChart3      = BarChart3;
export const IconShieldCheck    = ShieldCheck;
export const IconMonitor        = Monitor;
export const IconHammer         = Hammer;
export const IconMegaphone      = Megaphone;
export const IconPackage        = Package;
export const IconClipboardList  = ClipboardList;
export const IconTrendingUp     = TrendingUp;
export const IconTruck          = Truck;
export const IconBriefcase      = Briefcase;
export const IconScale          = Scale;
export const IconCreditCard     = CreditCard;
export const IconCamera         = Camera;
export const IconInbox          = Inbox;

// Toolbar / editor / thread
export const IconMore           = MoreHorizontal;
export const IconArrowUpDown    = ArrowUpDown;
export const IconEdit           = Edit3;
export const IconBold           = Bold;
export const IconItalic         = Italic;
export const IconUnderline      = Underline;
export const IconList           = ListIcon;
export const IconLayoutGrid     = LayoutGrid;
export const IconImage          = ImageIcon;
export const IconPrinter        = Printer;
export const IconExternalLink   = ExternalLink;
export const IconCheckCircle    = CheckCircle2;
