# Household Omi rules

These are this project’s agreed household rules, not a claim that every Omi group uses the same variations. The server implementation in `game.js` is authoritative.

## Setup

- Four players; two teams with partners opposite.
- Coral occupies shared-table seats 0 and 2; Jade occupies 1 and 3.
- Playing deck: **7, 8, 9, 10, J, Q, K, A** in all four suits; Ace high.
- The removed **2–6** cards represent ten scoring cards per team, red/black in the physical game.
- Deal each player four cards first, then another four unless Harf court is called.

## Trump selection

The chooser can:

1. Name a suit after viewing the first four cards; or
2. Commit, before viewing the second deal, to its **first, second, third, or fourth card**. That card’s suit becomes trump.

Deferred selection disables **Harf court for that round**, but not Full court.

After an immediate suit choice, eligible opponents may call Harf court or pass. After the second deal and trump resolution, eligible opponents may call Full court or pass. A pass is final for that declaration window. The chooser and their partner cannot call either court.

## Ordinary play

- Follow the led suit if you have it. Otherwise, any card is legal; there is no compulsory-trump or overtrump requirement.
- Highest trump wins the trick. If no trump is played, highest card of the led suit wins.
- The trick winner leads next.
- The normal opening lead belongs to the trump chooser.
- Normal play and trump-choice turns rotate to the **right**: bottom → right → top → left in the shared display.

## Cards remaining

Each team begins with **10**. A loss removes cards from that team; removed cards do **not** increase the winners’ balance. The first team at zero loses the match. A final penalty is capped at the cards that remain.

| Ordinary result | Penalty |
|---|---|
| Trump-calling team wins | Losing team −1 |
| Opposing team wins | Losing team −2 |
| Eight tricks without declaring Kapothi | Ordinary scoring; no extra penalty |

### Draws

A 4–4 draw removes nothing and leaves a pending draw. Further draws do not increase the penalty. The next resolved ordinary round removes **2** from the losing team, regardless of the trump caller, and clears the draw.

A resolved Harf court, Full court, or Kapothi also clears a pending draw, using its own fixed penalty. The draw does not add extra cards to that penalty. Example: draw → Harf court → normal trump-team win results in penalties of **0, 2, 1**.

## Harf court

- Call after the first four cards and immediate trump selection; the second four are never dealt.
- Only an opponent of the original chooser may call.
- Caller names a new trump; their partner sits out.
- The caller leads and plays alone against the two opponents.
- Caller must win **all four** tricks.
- Success: opponents lose **2** cards. Failure: caller’s team loses **2**.
- This special round clears a pending draw.
- The original trump chooser chooses again in a fresh deal, whether the court succeeds or fails.

## Full court

Same eligibility, new-trump choice, solo structure, penalty, draw handling, and original-chooser repeat as Harf court, except:

- Call after **all eight cards** are dealt, **before any card is played**.
- Caller must win **all eight** tricks.
- Deferred trump does not disable this declaration.

## Kapothi

- Available when one team wins the **first five tricks** of an ordinary round.
- Either teammate may declare or continue normally. The first valid decision received by the server applies.
- No new trump; both partners continue playing.
- Declaring team must also win the final three tricks.
- Success: opponents lose **3** cards. Failure: declaring team loses **2**.
- Clear a pending draw.
- Normal chooser rotation continues; the original chooser does not repeat just because Kapothi was declared.

## Table defaults and early resolution

- Shared-table seat 0 chooses trump first.
- A court caller leads their court; trick winners lead subsequent tricks.
- A court ends immediately when the caller loses a trick. Kapothi ends immediately when the declaring team loses a trick; the remaining cards cannot change the outcome.
- If two eligible opponents declare court simultaneously, the first valid server-received declaration applies.
- A normal round advances the chooser to the right. Harf/Full court preserve the original chooser for the next deal.
- Scoring cards are numeric remaining-card units, not tracked identities of individual removed red/black cards.

Change household defaults in `game.js` only with corresponding tests and documentation updates.
