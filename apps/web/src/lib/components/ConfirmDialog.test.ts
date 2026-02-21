import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ConfirmDialog from "./ConfirmDialog.svelte";

describe("ConfirmDialog", () => {
  it("renders the message text when open", () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Are you sure you want to delete this record?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.getByText("Are you sure you want to delete this record?")).toBeDefined();
  });

  it("renders the title 'Confirm Action' when open", () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Confirm?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.getByText("Confirm Action")).toBeDefined();
  });

  it("renders default confirm label 'Delete'", () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Delete this item?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("renders custom confirmLabel when provided", () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Remove this record?",
        confirmLabel: "Remove",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.getByText("Remove")).toBeDefined();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("does not render dialog content when open is false", () => {
    render(ConfirmDialog, {
      props: {
        open: false,
        message: "Should not appear",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.queryByText("Should not appear")).toBeNull();
    expect(screen.queryByText("Confirm Action")).toBeNull();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Confirm this action?",
        confirmLabel: "Yes",
        onConfirm,
        onCancel: vi.fn(),
      },
    });
    const confirmBtn = screen.getByText("Yes");
    await fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Cancel this?",
        onConfirm: vi.fn(),
        onCancel,
      },
    });
    const cancelBtn = screen.getByText("Cancel");
    await fireEvent.click(cancelBtn);
    // onCancel fires from the onclick handler AND from onOpenChange when the
    // dialog closes — so it is called at least once.
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders a Cancel button when open", () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        message: "Confirm?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(screen.getByText("Cancel")).toBeDefined();
  });
});
