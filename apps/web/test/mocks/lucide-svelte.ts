/**
 * Stub replacements for lucide-svelte icons.
 *
 * happy-dom cannot handle SVG element DOM manipulation (element.setAttribute
 * is not a function for SVGElement in happy-dom). This stub re-exports a
 * minimal compiled Svelte component (a single <span data-icon>) for every
 * named icon export so that the icon renders something safe in happy-dom.
 *
 * The IconStub is a proper Svelte 5 component that uses $.append correctly,
 * avoiding the "Cannot read properties of null (reading Symbol(nodeArray))"
 * error that a plain noop function causes when Svelte 5's dev-mode tree
 * walker tries to traverse after rendering.
 */
import IconStub from "./icon-stub.svelte";

export const Search = IconStub;
export const ChevronLeft = IconStub;
export const ChevronRight = IconStub;
export const AlertTriangle = IconStub;
export const X = IconStub;
export const Check = IconStub;
export const Plus = IconStub;
export const Minus = IconStub;
export const ArrowLeft = IconStub;
export const ArrowRight = IconStub;
export const Edit = IconStub;
export const Trash = IconStub;
export const Menu = IconStub;
export const Home = IconStub;
export const User = IconStub;
export const Settings = IconStub;
export const LogOut = IconStub;
export const Bell = IconStub;
export const ChevronDown = IconStub;
export const ChevronUp = IconStub;
export const CalendarDays = IconStub;
export const Calendar = IconStub;
export const Clock = IconStub;
export const MapPin = IconStub;
export const Route = IconStub;
export const Activity = IconStub;
export const Users = IconStub;
export const Building = IconStub;
export const Phone = IconStub;
export const Mail = IconStub;
export const Globe = IconStub;
export const Star = IconStub;
export const Heart = IconStub;
export const Info = IconStub;
export const AlertCircle = IconStub;
export const CheckCircle = IconStub;
export const XCircle = IconStub;
export const RefreshCw = IconStub;
export const Save = IconStub;
export const Upload = IconStub;
export const Download = IconStub;
export const Eye = IconStub;
export const EyeOff = IconStub;
export const Lock = IconStub;
export const Unlock = IconStub;
export const Key = IconStub;
export const Filter = IconStub;
export const SortAsc = IconStub;
export const SortDesc = IconStub;
export const MoreHorizontal = IconStub;
export const MoreVertical = IconStub;
export const ExternalLink = IconStub;
export const Link = IconStub;
export const Copy = IconStub;
export const Clipboard = IconStub;
export const Loader2 = IconStub;
export const Trash2 = IconStub;
export const Building2 = IconStub;
export const ClipboardList = IconStub;
export const Globe2 = IconStub;
export const FileText = IconStub;
export const ArrowLeftRight = IconStub;

export default IconStub;
