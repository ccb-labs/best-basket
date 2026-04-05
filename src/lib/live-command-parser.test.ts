import { parseLiveCommand, findMatchingItem } from "./live-command-parser";
import type { ListItemWithCategory } from "@/lib/types";

// -- parseLiveCommand tests --

describe("parseLiveCommand", () => {
  describe("check command (Feito)", () => {
    it("recognizes 'feito'", () => {
      expect(parseLiveCommand("feito")).toEqual({ type: "check" });
    });

    it("recognizes 'Feito' (capitalized)", () => {
      expect(parseLiveCommand("Feito")).toEqual({ type: "check" });
    });

    it("recognizes 'FEITO' (uppercase)", () => {
      expect(parseLiveCommand("FEITO")).toEqual({ type: "check" });
    });

    it("recognizes 'feita' (feminine)", () => {
      expect(parseLiveCommand("feita")).toEqual({ type: "check" });
    });

    it("handles trailing punctuation from STT", () => {
      expect(parseLiveCommand("feito.")).toEqual({ type: "check" });
      expect(parseLiveCommand("feito!")).toEqual({ type: "check" });
    });

    it("handles whitespace", () => {
      expect(parseLiveCommand("  feito  ")).toEqual({ type: "check" });
    });
  });

  describe("skip command (Próximo)", () => {
    it("recognizes 'próximo' (with accent)", () => {
      expect(parseLiveCommand("próximo")).toEqual({ type: "skip" });
    });

    it("recognizes 'proximo' (without accent)", () => {
      expect(parseLiveCommand("proximo")).toEqual({ type: "skip" });
    });

    it("recognizes 'próxima' (feminine)", () => {
      expect(parseLiveCommand("próxima")).toEqual({ type: "skip" });
    });

    it("recognizes 'Próximo' (capitalized)", () => {
      expect(parseLiveCommand("Próximo")).toEqual({ type: "skip" });
    });
  });

  describe("close command (Fechar)", () => {
    it("recognizes 'fechar'", () => {
      expect(parseLiveCommand("fechar")).toEqual({ type: "close" });
    });

    it("recognizes 'parar'", () => {
      expect(parseLiveCommand("parar")).toEqual({ type: "close" });
    });

    it("recognizes 'sair'", () => {
      expect(parseLiveCommand("sair")).toEqual({ type: "close" });
    });

    it("recognizes 'Fechar' (capitalized)", () => {
      expect(parseLiveCommand("Fechar")).toEqual({ type: "close" });
    });
  });

  describe("check specific item", () => {
    it("recognizes 'espinafre, check'", () => {
      expect(parseLiveCommand("espinafre, check")).toEqual({
        type: "check_specific",
        itemName: "espinafre",
      });
    });

    it("recognizes 'espinafre check' (no comma)", () => {
      expect(parseLiveCommand("espinafre check")).toEqual({
        type: "check_specific",
        itemName: "espinafre",
      });
    });

    it("recognizes 'Leite Check' (capitalized)", () => {
      expect(parseLiveCommand("Leite Check")).toEqual({
        type: "check_specific",
        itemName: "leite",
      });
    });

    it("handles multi-word item names", () => {
      expect(parseLiveCommand("azeite virgem, check")).toEqual({
        type: "check_specific",
        itemName: "azeite virgem",
      });
    });
  });

  describe("unknown command", () => {
    it("returns unknown for unrecognized input", () => {
      expect(parseLiveCommand("olá")).toEqual({ type: "unknown", raw: "olá" });
    });

    it("returns unknown for empty input", () => {
      expect(parseLiveCommand("")).toEqual({ type: "unknown", raw: "" });
    });

    it("preserves original text in raw field", () => {
      const result = parseLiveCommand("something random");
      expect(result).toEqual({ type: "unknown", raw: "something random" });
    });
  });
});

// -- findMatchingItem tests --

const makeItem = (
  id: string,
  name: string,
  checked = false
): ListItemWithCategory => ({
  id,
  list_id: "list-1",
  product_id: null,
  name,
  quantity: 1,
  unit_id: "unit-un",
  category_id: null,
  checked,
  categories: null,
  units: { abbreviation: "Un" },
});

const mockItems: ListItemWithCategory[] = [
  makeItem("1", "Espinafre"),
  makeItem("2", "Leite"),
  makeItem("3", "Pão de forma"),
  makeItem("4", "Limão"),
  makeItem("5", "Arroz", true), // checked
];

describe("findMatchingItem", () => {
  it("finds exact match (case-insensitive)", () => {
    expect(findMatchingItem("espinafre", mockItems)?.id).toBe("1");
    expect(findMatchingItem("Espinafre", mockItems)?.id).toBe("1");
    expect(findMatchingItem("LEITE", mockItems)?.id).toBe("2");
  });

  it("finds match ignoring accents", () => {
    // "limao" without accent should match "Limão"
    expect(findMatchingItem("limao", mockItems)?.id).toBe("4");
  });

  it("finds starts-with match", () => {
    // "espin" should match "Espinafre"
    expect(findMatchingItem("espin", mockItems)?.id).toBe("1");
  });

  it("finds contains match", () => {
    // "forma" should match "Pão de forma"
    expect(findMatchingItem("forma", mockItems)?.id).toBe("3");
  });

  it("skips checked items", () => {
    // "Arroz" is checked, should not be found
    expect(findMatchingItem("arroz", mockItems)).toBeNull();
  });

  it("returns null when no match", () => {
    expect(findMatchingItem("banana", mockItems)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(findMatchingItem("", mockItems)).toBeNull();
  });

  it("prefers exact match over partial", () => {
    const items = [
      makeItem("a", "Pão"),
      makeItem("b", "Pão de forma"),
    ];
    expect(findMatchingItem("pão", items)?.id).toBe("a");
  });
});
