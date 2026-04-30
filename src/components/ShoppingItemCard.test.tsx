import { render, screen, fireEvent } from "@testing-library/react";
import { ShoppingItemCard } from "./ShoppingItemCard";
import type { ListItemWithCategory } from "@/lib/types";
import type { BestDealInfo } from "@/lib/types";

const mockItem: ListItemWithCategory = {
  id: "item-1",
  list_id: "list-1",
  product_id: "product-1",
  name: "Milk",
  quantity: 2,
  unit_id: "unit-l",
  category_id: "cat-1",
  checked: false,
  checked_at: null,
  categories: { name: "Bebidas" },
  units: { abbreviation: "L", name: "Litro", gender: "m" as const },
};

const mockBestDeal: BestDealInfo = {
  storeName: "Lidl",
  unitPrice: 0.89,
  lineTotal: 1.78,
};

describe("ShoppingItemCard", () => {
  it("renders item name and quantity with unit", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={null}
        showPrices={false}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("2 Litros")).toBeInTheDocument();
  });

  it("renders quantity with default unit (Unidade)", () => {
    const itemDefaultUnit = { ...mockItem, unit_id: "unit-un", units: { abbreviation: "Un", name: "Unidade", gender: "f" as const } };
    render(
      <ShoppingItemCard
        item={itemDefaultUnit}
        checked={false}
        bestDeal={null}
        showPrices={false}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("2 Unidades")).toBeInTheDocument();
  });

  it("shows best deal info when showPrices is true", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={mockBestDeal}
        showPrices={true}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("@ Lidl")).toBeInTheDocument();
  });

  it("hides price info when showPrices is false", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={mockBestDeal}
        showPrices={false}
        onToggle={jest.fn()}
      />
    );

    expect(screen.queryByText("@ Lidl")).not.toBeInTheDocument();
  });

  it("does not show price when bestDeal is null", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={null}
        showPrices={true}
        onToggle={jest.fn()}
      />
    );

    expect(screen.queryByText("@ Lidl")).not.toBeInTheDocument();
  });

  it("calls onToggle with correct arguments when clicked", () => {
    const mockOnToggle = jest.fn();
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={null}
        showPrices={false}
        onToggle={mockOnToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Check Milk" }));
    expect(mockOnToggle).toHaveBeenCalledWith("item-1", true);
  });

  it("calls onToggle to uncheck when already checked", () => {
    const mockOnToggle = jest.fn();
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={true}
        bestDeal={null}
        showPrices={false}
        onToggle={mockOnToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Uncheck Milk" }));
    expect(mockOnToggle).toHaveBeenCalledWith("item-1", false);
  });

  it("renders checked visual state with strikethrough", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={true}
        bestDeal={null}
        showPrices={false}
        onToggle={jest.fn()}
      />
    );

    const nameElement = screen.getByText("Milk");
    expect(nameElement).toHaveClass("line-through");
  });

  it("renders unchecked visual state without strikethrough", () => {
    render(
      <ShoppingItemCard
        item={mockItem}
        checked={false}
        bestDeal={null}
        showPrices={false}
        onToggle={jest.fn()}
      />
    );

    const nameElement = screen.getByText("Milk");
    expect(nameElement).not.toHaveClass("line-through");
  });
});
