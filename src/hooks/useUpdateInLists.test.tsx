import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useUpdateInLists, type TemplateEditConfig } from "./useUpdateInLists";
import type { NewItemData } from "@/lib/types";

const newData: NewItemData = {
  name: "Organic Milk",
  quantity: 2,
  unit_id: "unit-l",
  category_id: "cat-1",
};

function makeConfig(matchingIds: string[]): TemplateEditConfig {
  return {
    templateId: "tpl-1",
    userLists: [
      { id: "list-a", name: "Week 1", source_template_id: "tpl-1" },
      { id: "list-b", name: "Party", source_template_id: null },
      { id: "list-c", name: "No milk here", source_template_id: null },
    ],
    findListsAction: jest.fn().mockResolvedValue(matchingIds),
    updateInListsAction: jest.fn().mockResolvedValue({ error: null }),
  };
}

// Tiny test component: a button that triggers offerUpdate, plus the dialog
function Harness({ config }: { config: TemplateEditConfig | undefined }) {
  const { offerUpdate, updateDialog, updateInListsError } = useUpdateInLists(config);
  return (
    <div>
      <button onClick={() => offerUpdate("Milk", newData)}>trigger</button>
      {updateInListsError && <p>{updateInListsError}</p>}
      {updateDialog}
    </div>
  );
}

describe("useUpdateInLists", () => {
  it("shows only lists that contain the item, mentioning the rename", async () => {
    const config = makeConfig(["list-a", "list-b"]);
    render(<Harness config={config} />);

    fireEvent.click(screen.getByText("trigger"));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(config.findListsAction).toHaveBeenCalledWith(["list-a", "list-b", "list-c"], "Milk");
    expect(screen.getByLabelText("Week 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Party")).toBeInTheDocument();
    expect(screen.queryByLabelText("No milk here")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Also update Milk to Organic Milk in these lists?"
    );
  });

  it("does not open the dialog when no list contains the item", async () => {
    const config = makeConfig([]);
    render(<Harness config={config} />);

    await act(async () => {
      fireEvent.click(screen.getByText("trigger"));
    });

    expect(config.findListsAction).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does nothing when there is no template config", async () => {
    render(<Harness config={undefined} />);
    await act(async () => {
      fireEvent.click(screen.getByText("trigger"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("applies the update to the selected lists using the old name", async () => {
    const config = makeConfig(["list-a", "list-b"]);
    render(<Harness config={config} />);

    fireEvent.click(screen.getByText("trigger"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Update in 1 list" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(config.updateInListsAction).toHaveBeenCalledWith(["list-a"], "Milk", newData);
  });

  it("closes without updating any list when the user taps Skip", async () => {
    const config = makeConfig(["list-a", "list-b"]);
    render(<Harness config={config} />);

    fireEvent.click(screen.getByText("trigger"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(config.updateInListsAction).not.toHaveBeenCalled();
  });

  it("shows the error returned by the update action", async () => {
    const config = makeConfig(["list-a"]);
    (config.updateInListsAction as jest.Mock).mockResolvedValue({
      error: "Updated 0 of 1 lists. Some lists could not be updated.",
    });
    render(<Harness config={config} />);

    fireEvent.click(screen.getByText("trigger"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Update in 1 list" }));

    expect(
      await screen.findByText("Updated 0 of 1 lists. Some lists could not be updated.")
    ).toBeInTheDocument();
  });
});
