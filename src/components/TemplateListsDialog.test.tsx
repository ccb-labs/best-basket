import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateListsDialog } from "./TemplateListsDialog";
import type { SyncTargets } from "@/lib/types";

const listTargets: SyncTargets = {
  targets: [
    { id: "list-a", name: "Week 1" },
    { id: "list-b", name: "Party" },
  ],
  preselectedIds: ["list-a"],
  noun: "list",
  preselectedLabel: "From this template",
  othersLabel: "Other lists",
};

function renderDialog(overrides: Partial<Parameters<typeof TemplateListsDialog>[0]> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <TemplateListsDialog
      targets={listTargets}
      message="Also update Milk in these lists?"
      actionVerb="Update"
      loadingLabel="Updating..."
      loading={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />
  );
  return { onConfirm, onCancel };
}

describe("TemplateListsDialog", () => {
  it("shows the message passed by the parent", () => {
    renderDialog();
    expect(screen.getByText("Also update Milk in these lists?")).toBeInTheDocument();
  });

  it("pre-selects only the preselected targets, under their own heading", () => {
    renderDialog();
    expect(screen.getByText("From this template")).toBeInTheDocument();
    expect(screen.getByText("Other lists")).toBeInTheDocument();
  });

  it("pre-selects only lists created from this template", () => {
    renderDialog();
    expect(screen.getByLabelText("Week 1")).toBeChecked();
    expect(screen.getByLabelText("Party")).not.toBeChecked();
  });

  it("uses the action verb on the confirm button", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Update in 1 list" })).toBeInTheDocument();
  });

  it("uses 'Add to' wording for the add flow", () => {
    renderDialog({ actionVerb: "Add", loadingLabel: "Adding..." });
    expect(screen.getByRole("button", { name: "Add to 1 list" })).toBeInTheDocument();
  });

  it("uses 'Remove from' wording for the delete flow", () => {
    renderDialog({ actionVerb: "Remove", loadingLabel: "Removing..." });
    expect(screen.getByRole("button", { name: "Remove from 1 list" })).toBeInTheDocument();
  });

  it("confirms with the selected list IDs", () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByLabelText("Party"));
    fireEvent.click(screen.getByRole("button", { name: "Update in 2 lists" }));
    expect(onConfirm).toHaveBeenCalledWith(["list-a", "list-b"]);
  });

  it("calls onCancel when Skip is clicked", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("talks about templates when the targets are templates", () => {
    renderDialog({
      targets: {
        targets: [
          { id: "tpl-1", name: "Weekly" },
          { id: "tpl-2", name: "Monthly" },
        ],
        preselectedIds: ["tpl-1"],
        noun: "template",
        preselectedLabel: "This list's template",
        othersLabel: "Other templates",
      },
      actionVerb: "Add",
      loadingLabel: "Adding...",
    });
    expect(screen.getByRole("dialog", { name: "Add item in templates" })).toBeInTheDocument();
    expect(screen.getByText("This list's template")).toBeInTheDocument();
    expect(screen.getByLabelText("Weekly")).toBeChecked();
    expect(screen.getByLabelText("Monthly")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Add to 1 template" })).toBeInTheDocument();
  });
});
