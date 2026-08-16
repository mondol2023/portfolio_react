"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { submitContactMessage } from "@/lib/actions/contact-actions";
import { contactDefaults, contactSchema, type ContactInput } from "@/lib/validation/contact-schema";

/**
 * Contact form.
 *
 * Validates with the same schema the Server Action re-validates with, so the
 * rules exist once. Field-level errors returned by the server are pushed back
 * into the form rather than flattened into a single banner, and the honeypot is
 * hidden from sight and from assistive technology without `display: none`,
 * which some bots detect.
 */

type Status = "idle" | "submitting" | "sent";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: contactDefaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("submitting");
    const result = await submitContactMessage(values);

    if (result.status === "error") {
      setStatus("idle");

      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (message) setError(field as keyof ContactInput, { message });
      }

      toast({ variant: "error", title: "Message not sent", description: result.message });
      return;
    }

    reset(contactDefaults);
    setStatus("sent");
    toast({
      variant: "success",
      title: "Message sent",
      description: "Thanks — I'll get back to you as soon as I can.",
    });
  });

  if (status === "sent") {
    return (
      <div
        // Focusable container so the confirmation is reachable, and a live
        // region so it is announced when it replaces the form.
        role="status"
        className="flex flex-col items-start gap-4 rounded-card border border-success/30 bg-success-subtle p-8"
      >
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium text-fg">Message sent</p>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            Thanks for reaching out. I read everything that comes through here and reply to
            anything that needs a reply.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message}>
          {(props) => (
            <Input {...props} {...register("name")} autoComplete="name" placeholder="Your name" />
          )}
        </Field>

        <Field label="Email" required error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </Field>
      </div>

      <Field label="Subject" required error={errors.subject?.message}>
        {(props) => (
          <Input {...props} {...register("subject")} placeholder="What is this about?" />
        )}
      </Field>

      <Field
        label="Message"
        required
        error={errors.message?.message}
        hint="A sentence or two about what you're building is plenty to start."
      >
        {(props) => (
          <Textarea {...props} {...register("message")} rows={6} placeholder="Tell me about it…" />
        )}
      </Field>

      {/* Honeypot — off-screen rather than hidden, and skipped by tab order. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          {...register("website")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-2">
        <Button type="submit" size="lg" isLoading={status === "submitting"} loadingLabel="Sending…">
          Send message
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
