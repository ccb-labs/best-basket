import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createListFromTemplate,
} from "../actions";

export const metadata: Metadata = { title: "My Templates" };
import { ShoppingListForm } from "@/components/ShoppingListForm";
import { TemplateCard } from "@/components/TemplateCard";
import { EmptyTemplateState } from "@/components/EmptyTemplateState";
import type { ShoppingList } from "@/lib/types";

/**
 * Templates page — shows all of the user's reusable list templates.
 *
 * Templates are shopping lists with is_template = true. Users create
 * them by clicking "Save as Template" on a regular list. From here,
 * they can use a template to create a new list, edit it, or delete it.
 *
 * This is a Server Component — it fetches data directly from Supabase.
 */
export default async function TemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all templates with their item counts in a single query.
  // Supabase's .select("*, list_items(count)") joins the related table
  // and returns the count inline, avoiding a second query.
  const { data: templatesData } = await supabase
    .from("shopping_lists")
    .select("*, list_items(count)")
    .eq("user_id", user!.id)
    .eq("is_template", true)
    .order("created_at", { ascending: false });

  const templates = (templatesData ?? []) as (ShoppingList & {
    list_items: [{ count: number }];
  })[];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">My Templates</h2>

      {/* Form to create a new empty template */}
      <ShoppingListForm createAction={createTemplate} placeholder="New template name..." />

      {templates.length === 0 ? (
        <EmptyTemplateState />
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              itemCount={template.list_items[0]?.count ?? 0}
              updateAction={updateTemplate}
              deleteAction={deleteTemplate}
              createFromTemplateAction={createListFromTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
