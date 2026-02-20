import { Command as CommandPrimitive } from "bits-ui";
import Dialog from "./command-dialog.svelte";

const Root = CommandPrimitive.Root;
const Input = CommandPrimitive.Input;
const List = CommandPrimitive.List;
const Empty = CommandPrimitive.Empty;
const Group = CommandPrimitive.Group;
const Item = CommandPrimitive.Item;
const Separator = CommandPrimitive.Separator;

export {
	Root,
	Input,
	List,
	Empty,
	Group,
	Item,
	Separator,
	Dialog,
};
