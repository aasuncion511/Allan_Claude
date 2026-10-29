import { prisma } from "@/lib/db";
import { readImageUpload } from "@/lib/image-upload";

export type DocumentTypeValue = "DRIVERS_LICENSE" | "GOVERNMENT_ID" | "PROOF_OF_BILLING" | "OTHER";

const VALID_TYPES: DocumentTypeValue[] = ["DRIVERS_LICENSE", "GOVERNMENT_ID", "PROOF_OF_BILLING", "OTHER"];

export async function uploadCustomerDocument(params: {
  organizationId: string;
  customerId: string;
  type: string;
  formData: FormData;
  fileField: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const type = VALID_TYPES.includes(params.type as DocumentTypeValue)
    ? (params.type as DocumentTypeValue)
    : "OTHER";

  const fileUrl = await readImageUpload(params.formData, params.fileField);
  if (!fileUrl) {
    return { ok: false, error: "Upload a PNG, JPG, or WEBP image (up to 1.5MB)." };
  }

  await prisma.customerDocument.create({
    data: {
      organizationId: params.organizationId,
      customerId: params.customerId,
      type,
      fileUrl,
      status: "PENDING",
    },
  });

  return { ok: true };
}

export async function reviewCustomerDocument(params: {
  organizationId: string;
  documentId: string;
  reviewedByUserId: string;
  approve: boolean;
  rejectionReason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const doc = await prisma.customerDocument.findFirst({
    where: { id: params.documentId, organizationId: params.organizationId },
  });
  if (!doc) return { ok: false, error: "Document not found." };

  await prisma.customerDocument.update({
    where: { id: doc.id },
    data: {
      status: params.approve ? "APPROVED" : "REJECTED",
      rejectionReason: params.approve ? null : (params.rejectionReason?.trim() || "Not specified"),
      reviewedByUserId: params.reviewedByUserId,
      reviewedAt: new Date(),
    },
  });

  return { ok: true };
}
