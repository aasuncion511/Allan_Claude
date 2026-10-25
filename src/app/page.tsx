import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { firstAccessibleRoute } from "@/lib/permissions";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? firstAccessibleRoute(user) : "/login");
}
