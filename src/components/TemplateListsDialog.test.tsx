import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateListsDialog } from "./TemplateListsDialog";

const lists = [
  { id: "list-a", name: "Week 1", source_template_id: "tpl-1" },
  { id: "list-b", name: "Party", source_template_id: null },
];

function renderDialog(overrides: Partial<Parameters<typeof TemplateListsDialog>[0]> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  render(
    <TemplateListsDialog
      lists={lists}
      templateId="tpl-1"
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
});
