import { buildSyncTargets, buildAddSyncTargets } from "./sync-targets";

const lists = [
  { id: "list-a", name: "Week 1", source_template_id: "tpl-1" },
  { id: "list-b", name: "Party", source_template_id: null },
];
const templates = [
  { id: "tpl-1", name: "Weekly" },
  { id: "tpl-2", name: "Monthly" },
];
const template = { id: "tpl-1", is_template: true, source_template_id: null };
const listFromTemplate = { id: "list-a", is_template: false, source_template_id: "tpl-1" };
const plainList = { id: "list-b", is_template: false, source_template_id: null };

describe("buildSyncTargets", () => {
  it("on a template, offers the lists and pre-ticks those made from it", () => {
    const result = buildSyncTargets(template, lists, templates);
    expect(result?.targets).toEqual(lists);
    expect(result?.preselectedIds).toEqual(["list-a"]);
    expect(result?.noun).toBe("list");
  });

  it("on a template with no lists, offers nothing", () => {
    expect(buildSyncTargets(template, [], templates)).toBeNull();
  });

  it("on a list, offers the templates and pre-ticks its source template", () => {
    const result = buildSyncTargets(listFromTemplate, lists, templates);
    expect(result?.targets).toEqual(templates);
    expect(result?.preselectedIds).toEqual(["tpl-1"]);
    expect(result?.noun).toBe("template");
  });

  it("on a list not made from a template, offers templates with none ticked", () => {
    const result = buildSyncTargets(plainList, lists, templates);
    expect(result?.targets).toEqual(templates);
    expect(result?.preselectedIds).toEqual([]);
  });

  it("on a list when the user has no templates, offers nothing", () => {
    expect(buildSyncTargets(listFromTemplate, lists, [])).toBeNull();
  });
});

describe("buildAddSyncTargets", () => {
  it("on a list made from a template, offers the templates", () => {
    const result = buildAddSyncTargets(listFromTemplate, lists, templates);
    expect(result?.preselectedIds).toEqual(["tpl-1"]);
  });

  it("on a list NOT made from a template, offers nothing (no prompt on every add)", () => {
    expect(buildAddSyncTargets(plainList, lists, templates)).toBeNull();
  });

  it("on a list whose source template was deleted, offers nothing", () => {
    const orphan = { id: "x", is_template: false, source_template_id: "deleted-tpl" };
    expect(buildAddSyncTargets(orphan, lists, templates)).toBeNull();
  });

  it("on a template, behaves like buildSyncTargets", () => {
    expect(buildAddSyncTargets(template, lists, templates)).toEqual(
      buildSyncTargets(template, lists, templates)
    );
  });
});
