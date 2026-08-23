"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Magnetic } from "@/components/experience/magnetic";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { submitContactMessage } from "@/lib/actions/contact-actions";
import { useTypingPulse } from "@/lib/experience/use-typing-pulse";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { contactDefaults, contactSchema, type ContactInput } from "@/lib/validation/contact-schema";

import { TransmissionField } from "./transmission-field";
import { TransmitButton, type TransmitStatus } from "./transmit-button";
import { WaveForm } from "./wave-form";

/**
 * The transmission form.
 *
 * Same contract as the form it replaces — one schema shared with the Server
 * Action that re-validates, field errors pushed back into the fields rather
 * than flattened into a banner, honeypot off-screen rather than
 * `display: none` — rebuilt as a channel-by-channel transmission.
 *
 * Channels open progressively: a field appears once the one before it holds
 * something the schema accepts. The order is a high-water mark, never a ratchet
 * that runs backwards — clearing an earlier field must not unmount a later one,
 * because the visitor could be focused inside it. Anyone who does not want the
 * drip can open every channel at once, which is also the path someone takes
 * when they want to survey the whole form before filling any of it.
 */

interface Channel {
  name: keyof ContactInput;
  label: string;
  placeholder: string;
  autoComplete: string;
  type?: string;
  multiline?: boolean;
  hint?: string;
}

const CHANNELS: readonly Channel[] = [
  { name: "name", label: "Identify", placeholder: "Your name", autoComplete: "name" },
  {
    name: "email",
    label: "Return frequency",
    placeholder: "you@example.com",
    autoComplete: "email",
    type: "email",
  },
  {
    name: "subject",
    label: "Subject",
    placeholder: "What is this about?",
    autoComplete: "off",
  },
  {
    name: "message",
    label: "Payload",
    placeholder: "Tell me about it...",
    autoComplete: "off",
    multiline: true,
    hint: "A sentence or two about what you are building is plenty to start.",
  },
];

/** Does this one value satisfy its own slice of the schema? */
function channelComplete(name: keyof ContactInput, value: string | undefined): boolean {
  return contactSchema.shape[name].safeParse(value ?? "").success;
}

export function TransmissionForm() {
  const reducedMotion = useMotionPreference();
  const { toast } = useToast();
  const { energy, bump } = useTypingPulse();

  const [status, setStatus] = useState<TransmitStatus>("idle");
  const [openChannels, setOpenChannels] = useState(1);
  const [touched, setTouched] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: contactDefaults,
  });

  const values = watch();

  // How many channels are complete, counting from the top and stopping at the
  // first gap — a filled message with an empty name is not "three done".
  const completed = useMemo(() => {
    let count = 0;
    for (const channel of CHANNELS) {
      if (!channelComplete(channel.name, values[channel.name])) break;
      count += 1;
    }
    return count;
  }, [values]);

  useEffect(() => {
    setOpenChannels((current) => Math.max(current, Math.min(completed + 1, CHANNELS.length)));
  }, [completed]);

  const onSubmit = handleSubmit(async (input) => {
    setStatus("sending");
    const result = await submitContactMessage(input);

    if (result.status === "error") {
      setStatus("idle");

      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (message) setError(field as keyof ContactInput, { message });
      }

      // A field the server rejected has to be reachable to be corrected, even
      // if the reader never opened it.
      setOpenChannels(CHANNELS.length);
      toast({ variant: "error", title: "Transmission failed", description: result.message });
      return;
    }

    setStatus("sent");
    reset(contactDefaults);
    toast({
      variant: "success",
      title: "Transmission received",
      description: "Thanks — I will get back to you as soon as I can.",
    });
  });

  if (status === "sent") {
    return (
      <TransmissionSent
        onReset={() => {
          setStatus("idle");
          setOpenChannels(1);
          setTouched(false);
        }}
      />
    );
  }

  const allOpen = openChannels >= CHANNELS.length;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      // One listener for the whole form: `input` bubbles, so the waveform is fed
      // without wrapping a handler around every `register` spread — which is
      // how a field quietly loses its `onChange` and stops validating.
      onInput={() => {
        bump();
        if (!touched) setTouched(true);
      }}
      className="flex flex-col gap-7"
    >
      <AnimatePresence initial={false}>
        {CHANNELS.slice(0, openChannels).map((channel, index) => {
          const error = errors[channel.name]?.message;
          const value = values[channel.name] ?? "";

          return (
            <motion.div
              key={channel.name}
              initial={reducedMotion ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <TransmissionField
                index={index + 1}
                label={channel.label}
                filled={channelComplete(channel.name, value)}
                error={error}
                hint={channel.hint}
              >
                {(props) =>
                  channel.multiline ? (
                    <Textarea
                      {...props}
                      {...register(channel.name)}
                      rows={6}
                      placeholder={channel.placeholder}
                      className="bg-surface/70 font-mono text-sm"
                    />
                  ) : (
                    <Input
                      {...props}
                      {...register(channel.name)}
                      type={channel.type ?? "text"}
                      autoComplete={channel.autoComplete}
                      placeholder={channel.placeholder}
                      className="bg-surface/70 font-mono text-sm"
                    />
                  )
                }
              </TransmissionField>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Honeypot — off-screen rather than hidden, and skipped by tab order. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="transmission-website">Website</label>
        <input
          id="transmission-website"
          {...register("website")}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase">
          <span>Signal</span>
          <span className="tabular-nums">
            {completed}/{CHANNELS.length} channels
          </span>
        </div>
        <WaveForm energy={energy} live={touched} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <TransmitButton status={status} disabled={completed < CHANNELS.length} />

        {!allOpen ? (
          <Magnetic strength={0.2}>
            <button
              type="button"
              onClick={() => setOpenChannels(CHANNELS.length)}
              className="rounded-lg px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-fg-subtle uppercase transition-colors hover:text-tone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
            >
              [ open all channels ]
            </button>
          </Magnetic>
        ) : null}
      </div>
    </form>
  );
}

function TransmissionSent({ onReset }: { onReset: () => void }) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      role="status"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-start gap-5 rounded-card border border-tone/40 bg-tone-soft p-8"
    >
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-tone uppercase">
        <motion.span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-tone"
          animate={reducedMotion ? { opacity: 1 } : { opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        Transmission received
      </div>

      <p className="text-sm leading-relaxed text-fg-muted">
        Thanks for reaching out. I read everything that comes through here and reply to anything
        that needs a reply.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="rounded-lg border border-border px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-fg-muted uppercase transition-colors hover:border-tone hover:text-tone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
      >
        [ open a new channel ]
      </button>
    </motion.div>
  );
}
