import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customer-form";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const action = updateCustomer.bind(null, customer.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${customer.name}`} />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <CustomerForm action={action} defaults={customer} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
