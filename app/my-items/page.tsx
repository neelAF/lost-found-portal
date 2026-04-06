import { redirect } from "next/navigation";

export default async function MyItemsPage() {
  redirect("/profile");
}
