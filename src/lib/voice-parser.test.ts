import { parsePortugueseInput } from "./voice-parser";

describe("parsePortugueseInput", () => {
  // --- Digit + name (singularized and capitalized) ---
  it("parses a digit followed by a product name", () => {
    expect(parsePortugueseInput("2 espinafres")).toEqual({
      quantity: 2,
      unit: null,
      name: "Espinafre",
    });
  });

  it("parses a decimal quantity with comma", () => {
    expect(parsePortugueseInput("1,5 litros de leite")).toEqual({
      quantity: 1.5,
      unit: "L",
      name: "Leite",
    });
  });

  // --- Compound patterns ---
  it("parses 'meio quilo de'", () => {
    expect(parsePortugueseInput("meio quilo de arroz")).toEqual({
      quantity: 0.5,
      unit: "Kg",
      name: "Arroz",
    });
  });

  it("parses 'um quilo de'", () => {
    expect(parsePortugueseInput("um quilo de batatas")).toEqual({
      quantity: 1,
      unit: "Kg",
      name: "Batata",
    });
  });

  it("parses 'meio litro de'", () => {
    expect(parsePortugueseInput("meio litro de leite")).toEqual({
      quantity: 0.5,
      unit: "L",
      name: "Leite",
    });
  });

  it("parses 'uma dúzia de'", () => {
    expect(parsePortugueseInput("uma dúzia de ovos")).toEqual({
      quantity: 12,
      unit: null,
      name: "Ovo",
    });
  });

  it("parses 'uma duzia de' (without accent)", () => {
    expect(parsePortugueseInput("uma duzia de ovos")).toEqual({
      quantity: 12,
      unit: null,
      name: "Ovo",
    });
  });

  // --- Number word + unit ---
  it("parses 'dois litros de'", () => {
    expect(parsePortugueseInput("dois litros de sumo")).toEqual({
      quantity: 2,
      unit: "L",
      name: "Sumo",
    });
  });

  it("parses 'três pacotes de'", () => {
    expect(parsePortugueseInput("3 pacotes de massa")).toEqual({
      quantity: 3,
      unit: "Emb",
      name: "Massa",
    });
  });

  // --- Number word without unit ---
  it("parses a Portuguese number word followed by a name", () => {
    expect(parsePortugueseInput("cinco bananas")).toEqual({
      quantity: 5,
      unit: null,
      name: "Banana",
    });
  });

  // --- Name only (fallback) ---
  it("defaults to quantity 1 when no number is given", () => {
    expect(parsePortugueseInput("leite")).toEqual({
      quantity: 1,
      unit: null,
      name: "Leite",
    });
  });

  // --- Edge cases ---
  it("handles extra whitespace", () => {
    expect(parsePortugueseInput("  2   espinafres  ")).toEqual({
      quantity: 2,
      unit: null,
      name: "Espinafre",
    });
  });

  it("handles uppercase input", () => {
    expect(parsePortugueseInput("LEITE")).toEqual({
      quantity: 1,
      unit: null,
      name: "Leite",
    });
  });

  it("returns empty name for empty input", () => {
    expect(parsePortugueseInput("")).toEqual({
      quantity: 1,
      unit: null,
      name: "",
    });
  });

  it("handles 'meio' without a unit as quantity 0.5", () => {
    expect(parsePortugueseInput("meio melão")).toEqual({
      quantity: 0.5,
      unit: null,
      name: "Melão",
    });
  });

  // --- Portuguese plural → singular patterns ---
  it("converts -ões to -ão (limões → Limão)", () => {
    expect(parsePortugueseInput("3 limões")).toEqual({
      quantity: 3,
      unit: null,
      name: "Limão",
    });
  });

  it("converts -ães to -ão (pães → Pão)", () => {
    expect(parsePortugueseInput("2 pães")).toEqual({
      quantity: 2,
      unit: null,
      name: "Pão",
    });
  });

  it("converts -ns to -m (atuns → Atum)", () => {
    expect(parsePortugueseInput("3 atuns")).toEqual({
      quantity: 3,
      unit: null,
      name: "Atum",
    });
  });

  it("converts -éis to -el (papéis → Papel)", () => {
    expect(parsePortugueseInput("2 papéis")).toEqual({
      quantity: 2,
      unit: null,
      name: "Papel",
    });
  });

  it("leaves already-singular words unchanged", () => {
    expect(parsePortugueseInput("arroz")).toEqual({
      quantity: 1,
      unit: null,
      name: "Arroz",
    });
  });
});
