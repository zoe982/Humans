import { Dialog as SheetPrimitive } from "bits-ui";
import Content from "./sheet-content.svelte";
import Overlay from "./sheet-overlay.svelte";
import Header from "./sheet-header.svelte";
import Footer from "./sheet-footer.svelte";
import Title from "./sheet-title.svelte";
import Description from "./sheet-description.svelte";

const Root = SheetPrimitive.Root;
const Trigger = SheetPrimitive.Trigger;
const Close = SheetPrimitive.Close;

export {
	Root,
	Trigger,
	Close,
	Content,
	Overlay,
	Header,
	Footer,
	Title,
	Description,
};
