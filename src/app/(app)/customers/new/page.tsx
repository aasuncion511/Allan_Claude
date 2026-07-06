import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/components/customer-form";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Customer" description="Add a renter to your CRM" />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <CustomerForm action={createCustomer} submitLabel="Add Customer" />
      </div>
    </div>
  );
}
