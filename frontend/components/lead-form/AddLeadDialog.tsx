"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLead } from "@/hooks/useLeads";
import { ApiError } from "@/lib/api";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/types";

const STATUS_ITEMS = LEAD_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
// Same rule as the backend: digits and common separators, optional leading +, at least 5 digits.
const PHONE_RE = /^\+?[\d\s().-]+$/;

type Errors = Partial<Record<"name" | "company" | "phone" | "form", string>>;

const EMPTY = { name: "", company: "", phone: "", status: "new" as LeadStatus };

function validate(values: typeof EMPTY): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Name is required";
  else if (values.name.trim().length > 200) errors.name = "Name must be at most 200 characters";
  if (values.company.trim().length > 200) errors.company = "Company must be at most 200 characters";
  const phone = values.phone.trim();
  if (phone && (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 5)) {
    errors.phone = "Enter a valid phone number, e.g. +91 98765 43210";
  }
  return errors;
}

export function AddLeadDialog() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const createLead = useCreateLead();

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    // Editing a field clears its error (and any form-level error).
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setValues(EMPTY);
      setErrors({});
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    createLead.mutate(
      {
        name: values.name.trim(),
        company: values.company.trim() || null,
        phone: values.phone.trim() || null,
        status: values.status,
      },
      {
        onSuccess: (lead) => {
          toast.success(`${lead.name} added`);
          handleOpenChange(false);
        },
        onError: (err) => {
          // Map backend field errors back onto the inputs; anything else goes on the form.
          const serverErrors: Errors = {};
          if (err instanceof ApiError) {
            for (const { field, message } of err.fieldErrors) {
              if (field === "name" || field === "company" || field === "phone") serverErrors[field] = message;
            }
          }
          if (Object.keys(serverErrors).length === 0) serverErrors.form = err.message;
          setErrors(serverErrors);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden />
        Add lead
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Only the name is required.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field id="lead-name" label="Name" error={errors.name}>
            <Input
              id="lead-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Meera Iyer"
              autoComplete="off"
              required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "lead-name-error" : undefined}
            />
          </Field>
          <Field id="lead-company" label="Company (optional)" error={errors.company}>
            <Input
              id="lead-company"
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="e.g. Finwise Advisors"
              autoComplete="off"
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={errors.company ? "lead-company-error" : undefined}
            />
          </Field>
          <Field id="lead-phone" label="Phone (optional)" error={errors.phone}>
            <Input
              id="lead-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="e.g. +91 98765 43210"
              autoComplete="off"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "lead-phone-error" : undefined}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label id="lead-status-label">Status</Label>
            <Select items={STATUS_ITEMS} value={values.status} onValueChange={(v) => v && set("status", v as LeadStatus)}>
              <SelectTrigger aria-labelledby="lead-status-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {errors.form && (
            <p role="alert" className="text-sm text-destructive">
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? "Adding…" : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
