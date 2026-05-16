import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getLostFoundStats, getLostItems } from "@/lib/lost-items";
import { HomePage } from "./components/home-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const [items, stats] = await Promise.all([
    getLostItems({
      status: "active",
      includeContactNumber: Boolean(session?.user?.email),
    }),
    getLostFoundStats(),
  ]);

  return <HomePage items={items} stats={stats} />;
}
