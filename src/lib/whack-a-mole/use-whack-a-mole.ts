"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CHARACTERS } from "./characters";
import { WHACK_CONFIG } from "./config";
import { GameState, type HoleMole } from "./types";

const HOLE_COUNT = WHACK_CONFIG.rows * WHACK_CONFIG.cols;

function emptyHoles(): HoleMole[] {
  return Array.from({ length: HOLE_COUNT }, () => ({
    phase: "empty" as const,
    character: null,
    token: 0,
    riseMs: WHACK_CONFIG.initialRiseMs,
    spinSpeed: WHACK_CONFIG.initialSpinSpeed,
  }));
}

/** Indexes are always in `[0, HOLE_COUNT)` by construction — this just satisfies `noUncheckedIndexedAccess`. */
function requireHole(holes: HoleMole[], index: number): HoleMole {
  const hole = holes[index];
  if (!hole) throw new Error(`whack-a-mole: hole ${index} out of range`);
  return hole;
}

/** A `setTimeout` that can be paused mid-flight and resumed later without losing its remaining delay. */
interface PausableTimer {
  fn: () => void;
  /** Underlying timeout id, or null while paused. */
  id: ReturnType<typeof setTimeout> | null;
  /** ms left to fire, captured at the moment it was paused (or its original delay, if never paused). */
  remainingMs: number;
  /** `performance.now()` when the currently-running timeout was (re)started. */
  startedAt: number;
}

/**
 * Drives the whack-a-mole board: spawning, timing, scoring and difficulty
 * ramp. Pure state + timers — no rendering — so the component stays a thin
 * view over `holes`/`score`/`state`.
 *
 * Every timer that governs normal board activity (spawning, rising, missing)
 * goes through `schedule`, which is pause-aware: a hit freezes the whole
 * board — nothing else rises, falls, or spawns — while the hammer and the
 * struck hole play out their own strike sequence on plain, un-pausable
 * timers. `unfreeze` resumes every paused timer with exactly the delay it
 * had left, so the board picks back up where it paused rather than skipping
 * ahead or restarting.
 */
export function useWhackAMole() {
  const [state, setState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState<number>(WHACK_CONFIG.startScore);
  const [holes, setHoles] = useState<HoleMole[]>(emptyHoles);
  const [frozen, setFrozen] = useState(false);

  const scoreRef = useRef(score);
  const holesRef = useRef(holes);
  const hitsRef = useRef(0);
  const runningRef = useRef(false);
  const frozenRef = useRef(false);
  const timersRef = useRef(new Map<number, PausableTimer>());
  const nextTimerIdRef = useRef(0);
  /** Hit-sequence timers (hit → dizzy → descend → empty) — deliberately exempt from freeze/unfreeze. */
  const rawTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** Holds the latest `spawnMole` so its own recursive re-schedule always calls the current closure. */
  const spawnMoleRef = useRef<() => void>(() => {});

  // Refs mirror state for timer callbacks (which run outside React's render
  // cycle) to read without going stale — kept in sync post-render, not during it.
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    holesRef.current = holes;
  }, [holes]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const key = nextTimerIdRef.current++;
    const entry: PausableTimer = { fn, remainingMs: ms, startedAt: performance.now(), id: null };
    if (!frozenRef.current) {
      entry.id = setTimeout(() => {
        timersRef.current.delete(key);
        fn();
      }, ms);
    }
    timersRef.current.set(key, entry);
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((entry) => {
      if (entry.id !== null) clearTimeout(entry.id);
    });
    timersRef.current.clear();
    rawTimersRef.current.forEach(clearTimeout);
    rawTimersRef.current.clear();
    frozenRef.current = false;
    setFrozen(false);
  }, []);

  /** Pauses every board timer (spawn, rise→up, up→miss) exactly where it stands. */
  const freeze = useCallback(() => {
    if (frozenRef.current) return;
    frozenRef.current = true;
    setFrozen(true);
    const now = performance.now();
    timersRef.current.forEach((entry) => {
      if (entry.id === null) return;
      clearTimeout(entry.id);
      entry.remainingMs = Math.max(0, entry.remainingMs - (now - entry.startedAt));
      entry.id = null;
    });
  }, []);

  /** Resumes every paused board timer with exactly the delay it had left. */
  const unfreeze = useCallback(() => {
    if (!frozenRef.current) return;
    frozenRef.current = false;
    setFrozen(false);
    const now = performance.now();
    timersRef.current.forEach((entry, key) => {
      if (entry.id !== null) return;
      entry.startedAt = now;
      entry.id = setTimeout(() => {
        timersRef.current.delete(key);
        entry.fn();
      }, entry.remainingMs);
    });
  }, []);

  const updateHole = useCallback((index: number, patch: Partial<HoleMole>) => {
    setHoles((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const next = [...prev];
      next[index] = { ...current, ...patch };
      return next;
    });
  }, []);

  /** Timings shrink (and spin speed climbs) every `difficultyStepHits` hits, floored/capped at the `min*`/`max*` values. */
  const currentTimings = useCallback(() => {
    const steps = Math.floor(hitsRef.current / WHACK_CONFIG.difficultyStepHits);
    const factor = WHACK_CONFIG.difficultyFactor ** steps;
    return {
      spawnMs: Math.max(WHACK_CONFIG.minSpawnIntervalMs, WHACK_CONFIG.initialSpawnIntervalMs * factor),
      riseMs: Math.max(WHACK_CONFIG.minRiseMs, WHACK_CONFIG.initialRiseMs * factor),
      upMs: Math.max(WHACK_CONFIG.minUpMs, WHACK_CONFIG.initialUpMs * factor),
      spinSpeed: Math.min(WHACK_CONFIG.maxSpinSpeed, WHACK_CONFIG.initialSpinSpeed / factor),
    };
  }, []);

  const endGame = useCallback(
    (won: boolean) => {
      runningRef.current = false;
      clearAllTimers();
      setState(won ? GameState.WON : GameState.LOST);
    },
    [clearAllTimers],
  );

  const spawnMole = useCallback(() => {
    if (!runningRef.current) return;

    const scheduleNextSpawn = (ms: number) => schedule(() => spawnMoleRef.current(), ms);

    const { spawnMs, riseMs, upMs, spinSpeed } = currentTimings();
    const emptyIndexes = holesRef.current
      .map((hole, index) => (hole.phase === "empty" ? index : -1))
      .filter((index) => index !== -1);

    if (emptyIndexes.length === 0) {
      scheduleNextSpawn(spawnMs);
      return;
    }

    const index = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    if (index === undefined) {
      scheduleNextSpawn(spawnMs);
      return;
    }

    const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    if (!character) return; // CHARACTERS is a non-empty constant; unreachable in practice
    const token = requireHole(holesRef.current, index).token + 1;

    updateHole(index, { phase: "rising", character, token, riseMs, spinSpeed });

    schedule(() => {
      if (!runningRef.current || requireHole(holesRef.current, index).token !== token) return;
      updateHole(index, { phase: "up" });

      schedule(() => {
        if (!runningRef.current || requireHole(holesRef.current, index).token !== token) return;
        updateHole(index, { phase: "empty" }); // missed — no score change
      }, upMs);
    }, riseMs);

    scheduleNextSpawn(spawnMs);
  }, [currentTimings, schedule, updateHole]);

  useEffect(() => {
    spawnMoleRef.current = spawnMole;
  }, [spawnMole]);

  const hit = useCallback(
    (index: number) => {
      if (!runningRef.current || frozenRef.current) return;
      const hole = requireHole(holesRef.current, index);
      if (hole.phase !== "up" || !hole.character) return;

      const token = hole.token;
      const points = hole.character.points;

      // Freeze the whole board the instant the hole is clicked — every other
      // hole (and the idle rotation on every creature) holds still while the
      // hammer swings in. The target itself stays visually fixed too: it only
      // shows an impact reaction once the hammer has actually finished
      // growing onto it (WHACK_CONFIG.hammerImpactMs), not before — otherwise
      // the hole looked hit before the hammer even appeared to touch it.
      freeze();

      const runExempt = (fn: () => void, ms: number) => {
        const id = setTimeout(() => {
          rawTimersRef.current.delete(id);
          fn();
        }, ms);
        rawTimersRef.current.add(id);
      };

      runExempt(() => {
        if (requireHole(holesRef.current, index).token !== token) return;
        updateHole(index, { phase: "hit" });

        hitsRef.current += 1;
        const next = Math.min(
          WHACK_CONFIG.winScore,
          Math.max(WHACK_CONFIG.loseScore, scoreRef.current + points),
        );
        setScore(next);

        runExempt(() => {
          if (requireHole(holesRef.current, index).token === token) updateHole(index, { phase: "dizzy" });
        }, WHACK_CONFIG.impactMs);

        runExempt(
          () => {
            if (requireHole(holesRef.current, index).token === token) updateHole(index, { phase: "descending" });
          },
          WHACK_CONFIG.impactMs + WHACK_CONFIG.dizzyMs,
        );

        runExempt(
          () => {
            if (requireHole(holesRef.current, index).token === token) updateHole(index, { phase: "empty" });
            unfreeze(); // board resumes right where it paused
          },
          WHACK_CONFIG.impactMs + WHACK_CONFIG.dizzyMs + WHACK_CONFIG.descendMs,
        );

        if (next <= WHACK_CONFIG.loseScore) endGame(false);
        else if (next >= WHACK_CONFIG.winScore) endGame(true);
      }, WHACK_CONFIG.hammerImpactMs);
    },
    [endGame, freeze, unfreeze, updateHole],
  );

  const start = useCallback(() => {
    clearAllTimers();
    hitsRef.current = 0;
    runningRef.current = true;
    setScore(WHACK_CONFIG.startScore);
    setHoles(emptyHoles());
    setState(GameState.PLAYING);
    schedule(spawnMole, 400);
  }, [clearAllTimers, schedule, spawnMole]);

  // Stop all pending timers on unmount.
  useEffect(() => clearAllTimers, [clearAllTimers]);

  return { state, score, holes, frozen, hit, start };
}
