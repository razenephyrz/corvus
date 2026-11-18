import { requireUser } from "@/lib/auth";
import { Flash } from "@/components/ui";
import { UserDash } from "./UserDash";
import { AdminDash } from "./AdminDash";
import { SuperDash } from "./SuperDash";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  return (
    <>
      {(sp.ok || sp.err) && (
        <div className="px-[26px] pt-4 max-sm:px-[14px]">
          <Flash ok={sp.ok} err={sp.err} />
        </div>
      )}
      {u.uiRole === "superadmin" ? <SuperDash user={u} /> : u.uiRole === "admin" ? <AdminDash user={u} /> : <UserDash user={u} />}
    </>
  );
}
