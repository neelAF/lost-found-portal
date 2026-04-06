import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getLostItems } from "@/lib/lost-items";
import { HomePage } from "./components/home-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const items = await getLostItems({
    status: "active",
    includeContactNumber: Boolean(session?.user?.email),
  });

  return <HomePage items={items} />;
}
