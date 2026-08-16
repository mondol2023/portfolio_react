import { Inbox, Mail } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ToggleActionButton } from "@/components/admin/toggle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteMessageAction, setMessageReadAction } from "@/lib/actions/message-actions";
import { getMessages } from "@/lib/firebase/repositories/messages-repository";
import { formatFullDate } from "@/lib/utils/dates";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const messages = await getMessages();

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Everything submitted through the public contact form. Nothing here is shown on the site."
      />

      {messages.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No messages"
          description="When somebody writes through the contact form, their message appears here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className="rounded-card border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-medium text-fg">{message.subject}</h2>
                    {message.read ? null : <Badge variant="accent">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {message.name} ·{" "}
                    <a
                      href={`mailto:${message.email}`}
                      className="underline decoration-border underline-offset-4 transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {message.email}
                    </a>
                  </p>
                </div>

                <time
                  dateTime={message.createdAt}
                  className="shrink-0 font-mono text-xs text-fg-subtle"
                >
                  {formatFullDate(message.createdAt)}
                </time>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                {message.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <ButtonLink
                  href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                  variant="ghost"
                  size="sm"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  Reply
                </ButtonLink>

                <ToggleActionButton
                  id={message.id}
                  value={message.read}
                  action={setMessageReadAction}
                  labelOn="Mark unread"
                  labelOff="Mark read"
                  successTitleOn="Marked as read"
                  successTitleOff="Marked as unread"
                />

                <div className="ml-auto">
                  <DeleteButton
                    id={message.id}
                    action={deleteMessageAction}
                    name={message.subject}
                    entity="message"
                    successTitle="Message deleted"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
