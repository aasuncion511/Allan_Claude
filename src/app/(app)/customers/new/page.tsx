import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requirePermission("customers");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Customer" description="Add a renter to your CRM" />
      <div className="rounded-xl border border-line bg-surface p-6">
        <CustomerForm action={createCustomer} submitLabel="Add Customer" />
      </div>
    </div>
  );
}
