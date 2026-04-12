import { parsePortugueseInput } from "./voice-parser";

describe("parsePortugueseInput", () => {
  // --- Digit + name (singularized and capitalized) ---
  it("parses a digit followed by a product name", () => {
    expect(parsePortugueseInput("2 espinafres")).toEqual({
      quantity: 2,
      unit: null,
      name: "Espinafre",
      category: null,
    });
  });

  it("parses a decimal quantity with comma", () => {
    expect(parsePortugueseInput("1,5 litros de leite")).toEqual({
      quantity: 1.5,
      unit: "L",
      name: "Leite",
      category: null,
    });
  });

  // --- Compound patterns ---
  it("parses 'meio quilo de'", () => {
    expect(parsePortugueseInput("meio quilo de arroz")).toEqual({
      quantity: 0.5,
      unit: "Kg",
      name: "Arroz",
      category: null,
    });
  });

  it("parses 'um quilo de'", () => {
    expect(parsePortugueseInput("um quilo de batatas")).toEqual({
      quantity: 1,
      unit: "Kg",
      name: "Batata",
      category: null,
    });
  });

  it("parses 'meio litro de'", () => {
    expect(parsePortugueseInput("meio litro de leite")).toEqual({
      quantity: 0.5,
      unit: "L",
      name: "Leite",
      category: null,
    });
  });

  it("parses 'uma dúzia de'", () => {
    expect(parsePortugueseInput("uma dúzia de ovos")).toEqual({
      quantity: 12,
      unit: null,
      name: "Ovo",
      category: null,
    });
  });

  it("parses 'uma duzia de' (without accent)", () => {
    expect(parsePortugueseInput("uma duzia de ovos")).toEqual({
      quantity: 12,
      unit: null,
      name: "Ovo",
      category: null,
    });
  });

  // --- Number word + unit ---
  it("parses 'dois litros de'", () => {
    expect(parsePortugueseInput("dois litros de sumo")).toEqual({
      quantity: 2,
      unit: "L",
      name: "Sumo",
      category: null,
    });
  });

  it("parses 'três pacotes de'", () => {
    expect(parsePortugueseInput("3 pacotes de massa")).toEqual({
      quantity: 3,
      unit: "Emb",
      name: "Massa",
      category: null,
    });
  });

  // --- Abbreviated units (Speech API transcriptions) ---
  it("parses '500 g de cenoura' (abbreviated grams)", () => {
    expect(parsePortugueseInput("500 g de cenoura")).toEqual({
      quantity: 500,
      unit: "g",
      name: "Cenoura",
      category: null,
    });
  });

  it("parses '2 l de leite' (abbreviated liters)", () => {
    expect(parsePortugueseInput("2 l de leite")).toEqual({
      quantity: 2,
      unit: "L",
      name: "Leite",
      category: null,
    });
  });

  // --- Number word without unit ---
  it("parses a Portuguese number word followed by a name", () => {
    expect(parsePortugueseInput("cinco bananas")).toEqual({
      quantity: 5,
      unit: null,
      name: "Banana",
      category: null,
    });
  });

  // --- Name only (fallback) ---
  it("defaults to quantity 1 when no number is given", () => {
    expect(parsePortugueseInput("leite")).toEqual({
      quantity: 1,
      unit: null,
      name: "Leite",
      category: null,
    });
  });

  // --- Edge cases ---
  it("handles extra whitespace", () => {
    expect(parsePortugueseInput("  2   espinafres  ")).toEqual({
      quantity: 2,
      unit: null,
      name: "Espinafre",
      category: null,
    });
  });

  it("handles uppercase input", () => {
    expect(parsePortugueseInput("LEITE")).toEqual({
      quantity: 1,
      unit: null,
      name: "Leite",
      category: null,
    });
  });

  it("returns empty name for empty input", () => {
    expect(parsePortugueseInput("")).toEqual({
      quantity: 1,
      unit: null,
      name: "",
      category: null,
    });
  });

  it("handles 'meio' without a unit as quantity 0.5", () => {
    expect(parsePortugueseInput("meio melão")).toEqual({
      quantity: 0.5,
      unit: null,
      name: "Melão",
      category: null,
    });
  });

  // --- Portuguese plural → singular patterns ---
  it("converts -ões to -ão (limões → Limão)", () => {
    expect(parsePortugueseInput("3 limões")).toEqual({
      quantity: 3,
      unit: null,
      name: "Limão",
      category: null,
    });
  });

  it("converts -ães to -ão (pães → Pão)", () => {
    expect(parsePortugueseInput("2 pães")).toEqual({
      quantity: 2,
      unit: null,
      name: "Pão",
      category: null,
    });
  });

  it("converts -ns to -m (atuns → Atum)", () => {
    expect(parsePortugueseInput("3 atuns")).toEqual({
      quantity: 3,
      unit: null,
      name: "Atum",
      category: null,
    });
  });

  it("converts -éis to -el (papéis → Papel)", () => {
    expect(parsePortugueseInput("2 papéis")).toEqual({
      quantity: 2,
      unit: null,
      name: "Papel",
      category: null,
    });
  });

  it("leaves already-singular words unchanged", () => {
    expect(parsePortugueseInput("arroz")).toEqual({
      quantity: 1,
      unit: null,
      name: "Arroz",
      category: null,
    });
  });

  // --- Category extraction via "categoria" keyword ---
  it("extracts category from 'X categoria Y' pattern", () => {
    expect(parsePortugueseInput("500 gramas de cenoura categoria legumes")).toEqual({
      quantity: 500,
      unit: "g",
      name: "Cenoura",
      category: "Legumes",
    });
  });

  it("extracts category with 'na categoria' (natural speech)", () => {
    expect(parsePortugueseInput("500 gramas de cenoura na categoria legumes")).toEqual({
      quantity: 500,
      unit: "g",
      name: "Cenoura",
      category: "Legumes",
    });
  });

  it("extracts category with number-word quantity", () => {
    expect(parsePortugueseInput("dois litros de leite categoria bebidas")).toEqual({
      quantity: 2,
      unit: "L",
      name: "Leite",
      category: "Bebidas",
    });
  });

  it("extracts category with name-only input", () => {
    expect(parsePortugueseInput("arroz categoria cereais")).toEqual({
      quantity: 1,
      unit: null,
      name: "Arroz",
      category: "Cereais",
    });
  });

  it("handles multi-word category names", () => {
    expect(parsePortugueseInput("sabão categoria higiene pessoal")).toEqual({
      quantity: 1,
      unit: null,
      name: "Sabão",
      category: "Higiene pessoal",
    });
  });

  it("returns null category when nothing follows 'categoria'", () => {
    expect(parsePortugueseInput("leite categoria ")).toEqual({
      quantity: 1,
      unit: null,
      name: "Leite",
      category: null,
    });
  });

  // --- Unit "unidades" recognition with category ---
  it("parses '7 unidades de laranjas na categoria frutas'", () => {
    expect(parsePortugueseInput("7 unidades de laranjas na categoria frutas")).toEqual({
      quantity: 7,
      unit: "Un",
      name: "Laranja",
      category: "Frutas",
    });
  });

  // --- Title case for multi-word product names ---
  it("title-cases multi-word names, keeping small words lowercase", () => {
    expect(parsePortugueseInput("2 sumo de laranja")).toEqual({
      quantity: 2,
      unit: null,
      name: "Sumo de Laranja",
      category: null,
    });
  });

  it("title-cases 'gelado de baunilha'", () => {
    expect(parsePortugueseInput("gelado de baunilha")).toEqual({
      quantity: 1,
      unit: null,
      name: "Gelado de Baunilha",
      category: null,
    });
  });
});
