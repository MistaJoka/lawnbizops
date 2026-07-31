# SOP-02 — Estimate and delivery

| Trigger                                   | Frequency | Screens                                            | Time    |
| ----------------------------------------- | --------- | -------------------------------------------------- | ------- |
| A lead (or existing client) wants a price | Per quote | Client detail, Estimate screens, Money → Estimates | ~10 min |

## TL;DR

Create the estimate **from the client's page** so client and property carry over, send it the same visit (email with approval link is the strongest path), and let the nightly automation chase silence for you. The one rule: **an estimate isn't delivered until its status chip reads Sent** — a draft is a price you know and the customer doesn't.

## ELI5

An estimate is a price tag you hand over before doing the work. This SOP is: write the tag, hand it over, and check back if they go quiet. The app even gives the customer a private web page where they can press a big green "yes" button — so you find out the moment they decide, not the next time you bump into them.

## Before you start

- [ ] The client exists with at least one contact channel (SOP-01).
- [ ] If a "yes" should turn into recurring visits, the property is on file **before** you send — an accepted estimate with no property hides the recurring option ([G-06](../../ops-manual-findings-2026-07-31.md#g-06)).
- [ ] Your **Service catalog** (More → Service catalog) has your common services priced, so lines are one tap.

## Steps

1. Open the client → tap **Create estimate** (on a Lead/Quoted client it's the big primary button; also available from a Pipeline card's **Quote** or the "Needs: Estimate" readiness chip).
   > **You should see:** the New estimate form with the client already selected — if you started from their page, the property too.
2. Add lines: tap service chips for catalog items, or **+ Add line** for custom Description / Qty / Price. Set **Valid until** (defaults ~30 days out). Watch the live total.
3. Tap **Create estimate**.
   > **You should see:** the estimate detail page, status chip **Draft**. Drafts are editable (**Edit**) and deletable (**Delete draft**).
4. **Send it — pick the strongest path available:**
   - **Email estimate** (best): sends a real email containing the approval link, flips status to Sent. Requires an email on the client — the button is disabled otherwise, with "Add an email to the client to send directly."
   - No email? Tap **Mark sent**, then **Send approval link** and text the link to them.
     > **You should see:** under Send approval link, "Customer can approve or decline online — no app needed."
   - Paper person standing in front of you? **Share PDF**.
     > **Gap [G-09]:** Share PDF is disabled until the server assigns the estimate number ("Syncs first — number pending") — offline it won't work on a brand-new estimate. Email queues fine offline. → [findings](../../ops-manual-findings-2026-07-31.md#g-09)
5. What the customer sees at their link: your letterhead, the line items and total, and **Approve this estimate** / **Decline** buttons (decline asks "Mind sharing why?"). Once they respond or it expires, the page locks.
   > **Gap [G-20]:** anyone with the link can press approve — there's no typed name or signature. Send it directly to the customer's own phone/email and keep the thread; for big-ticket work, confirm the approval with a follow-up text. → [findings](../../ops-manual-findings-2026-07-31.md#g-20)
6. Watch for the answer in two places: the **Needs attention** card on Today ("Customer approved…" / "Customer declined…") and **Money → Estimates**, where unanswered quotes sit in the **Awaiting response** card.
7. Chase silence: after ~3 days the nightly sweep creates a follow-up task automatically; or tap **Follow up** on the Awaiting response row — it opens a prefilled text and logs the touch.
   > **Gap [G-02]:** all messaging is one-way from the app; replies come to your own phone/inbox. Prefer SMS when you expect an answer. → [findings](../../ops-manual-findings-2026-07-31.md#g-02)
8. If they say yes → **SOP-03 immediately.** If they decline in person, tap **Declined** and pick a reason (Price too high / Bad timing / Went with someone else / No response) — future-you will want the pattern.
9. Expired or declined quotes aren't dead: **Renew estimate** clones a fresh 30-day draft. Stale sent quotes auto-expire when Valid until passes (nightly sweep).

## Done when

- Status chip reads **Sent** and the customer verifiably has it (email shows "Emailed <date>", link shared, or PDF handed over).
- The client's stage advanced to **Quoted** (sending does this automatically).
- A response within the validity window either became SOP-03 or a recorded decline reason.

## What can go wrong

| Symptom                                  | Cause                                                                                          | Fix                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Email estimate** greyed out            | Client has no email                                                                            | Add one on the client, or use Mark sent + approval link by text |
| **Share PDF** greyed out                 | Number not yet synced ([G-09](../../ops-manual-findings-2026-07-31.md#g-09))                   | Get signal for ten seconds, or email instead                    |
| Customer says the link is "expired"      | Past Valid until                                                                               | **Renew estimate**, send the fresh link                         |
| Can't edit an accepted/declined estimate | Editing is locked after response                                                               | **Renew estimate** to issue a fresh copy                        |
| You never noticed they approved          | Only surfaces on Today's attention card ([G-03](../../ops-manual-findings-2026-07-31.md#g-03)) | Morning check + watch Awaiting response weekly                  |

## Related

[SOP-01](sop-01-lead-intake.md) · [SOP-03](sop-03-winning-the-work.md) · [reference/money.md](../reference/money.md) · [reference/public-pages.md](../reference/public-pages.md)
