/**
 * Shows reminder banners for templates that are "due".
 *
 * A template is due when its recurrence period has passed since last use:
 * - Weekly templates: due after 7 days
 * - Monthly templates: due after 30 days
 *
 * Each banner links to the /templates page where the user can create
 * a new list from the template.
 *
 * This is a Server Component — no interactivity needed, it just
 * displays information and links.
 */

import Link from "next/link";
import type { ShoppingList } from "@/lib/types";

export function TemplateReminderBanner({
  dueTemplates,
}: {
  /** Templates whose recurrence period has passed */
  dueTemplates: ShoppingList[];
}) {
  if (dueTemplates.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {dueTemplates.map((template) => (
        <div
          key={template.id}
          className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-sm text-amber-800">
            Time to create a new{" "}
            <span className="font-medium">&quot;{template.name}&quot;</span>{" "}
            list!
          </p>
          <Link
            href="/templates"
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            View Templates
          </Link>
        </div>
      ))}
    </div>
  );
}
