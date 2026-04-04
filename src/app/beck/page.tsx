/**
 * /beck — Household entry point for the Beck family.
 *
 * Currently renders the same login page. When multi-household support is
 * complete, this will query the households table by slug and load only the
 * Beck profiles dynamically.
 */
import { redirect } from "next/navigation";

export default function BeckPage() {
  redirect("/login");
}
