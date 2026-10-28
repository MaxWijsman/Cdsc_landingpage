((Q) => {
  "use strict";
  Q.games = Q.games || {};
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const stars = (score) => score >= 90 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0;
  const grade = (score, critical, feedback, output = "") => ({ score: critical ? Math.min(39, clamp(score)) : clamp(score), critical: !!critical, feedback, output });
  const attempt = (id, fields) => ({ gameId: id, revision: Q.games[id]?.revision || 1, phase: "intro", round: 0, results: [], ...fields });
  const cleanResult = (result) => ({ score: clamp(result.score), critical: result.critical === true, firstScore: Number.isFinite(result.firstScore) ? clamp(result.firstScore) : null });
  const next = (state, count, reset) => {
    if (state.phase !== "feedback" || !state.evaluation || state.results.length !== state.round) return state;
    state.results.push(cleanResult(state.evaluation));
    if (state.round + 1 === count) state.phase = "completed";
    else { state.round++; Object.assign(state, reset(state.round), { phase: "active", evaluation: null }); }
    return state;
  };
  const hydrateBase = (id, raw, count) => {
    if (!raw || raw.gameId !== id || raw.revision !== Q.games[id].revision || !["intro", "active", "feedback", "completed"].includes(raw.phase)) return null;
    if (!Number.isInteger(raw.round) || raw.round < 0 || raw.round >= count || !Array.isArray(raw.results) || raw.results.length > count) return null;
    if (raw.results.some((result) => !result || !Number.isFinite(result.score) || result.score < 0 || result.score > 100 || typeof result.critical !== "boolean")) return null;
    if (raw.phase === "completed" ? raw.results.length !== count : raw.results.length !== raw.round) return null;
    if (raw.phase === "intro" && (raw.round !== 0 || raw.results.length)) return null;
    return { gameId: id, revision: raw.revision, phase: raw.phase, round: raw.round, results: raw.results.map(cleanResult) };
  };
  const result = (state) => {
    const critical = state.results.some((item) => item.critical);
    const average = state.results.length ? state.results.reduce((sum, item) => sum + item.score, 0) / state.results.length : 0;
    const score = Math.round(critical ? Math.min(39, average) : average);
    return { score, critical, stars: stars(score) };
  };
  const register = (game) => {
    if (!game.id || ["createAttempt", "reduce", "evaluate", "render", "hydrate"].some((method) => typeof game[method] !== "function")) throw new Error("Invalid game registration");
    Q.games[game.id] = game;
  };
  const initialProgress = () => ({ schemaVersion: 1, trackId: "ai-office-quest", contentVersion: Q.content?.version || 1, updatedAt: new Date().toISOString(), lastGameId: null, welcomeSeen: false, games: {} });
  const record = (progress, id, state, newAttempt = false) => {
    const old = progress.games[id]?.revision === state.revision ? progress.games[id] : { revision: state.revision, completed: false, bestScore: null, bestSafetyClear: false, attemptCount: 0, checkpoint: null };
    const entry = { ...old, checkpoint: clone(state), attemptCount: old.attemptCount + (newAttempt ? 1 : 0) };
    if (state.phase === "completed") {
      const score = result(state);
      entry.completed = true;
      if (entry.bestScore === null || score.score > entry.bestScore || score.score === entry.bestScore && !score.critical) {
        entry.bestScore = score.score;
        entry.bestSafetyClear = !score.critical;
      }
    }
    progress.games[id] = entry;
    progress.lastGameId = id;
    return progress;
  };
  const summary = (progress) => {
    const entries = Q.content.order.map((id) => progress.games[id]);
    const completed = entries.filter((entry) => entry?.completed).length;
    return { completed, percent: completed * 20, score: entries.reduce((sum, entry) => sum + (entry?.bestScore || 0), 0), stars: entries.reduce((sum, entry) => sum + (entry?.completed ? stars(entry.bestScore) : 0), 0), badge: entries.every((entry) => entry?.completed && entry.bestScore >= 70 && entry.bestSafetyClear) };
  };
  const validateProgress = (raw) => {
    if (!raw || raw.schemaVersion !== 1 || raw.trackId !== "ai-office-quest" || !raw.games || typeof raw.games !== "object") throw new Error("Unsupported progress");
    const progress = initialProgress();
    progress.welcomeSeen = raw.welcomeSeen === true;
    for (const id of Q.content.order) {
      const entry = raw.games[id];
      if (!entry) continue;
      if (entry.revision !== Q.games[id].revision) continue;
      const validBest = Number.isInteger(entry.bestScore) && entry.bestScore >= 0 && entry.bestScore <= 100;
      progress.games[id] = {
        revision: Q.games[id].revision,
        completed: entry.completed === true && validBest,
        bestScore: validBest ? entry.bestScore : null,
        bestSafetyClear: entry.bestSafetyClear === true,
        attemptCount: Number.isInteger(entry.attemptCount) ? clamp(entry.attemptCount, 0, 100000) : 0,
        checkpoint: Q.games[id].hydrate(entry.checkpoint),
      };
    }
    progress.lastGameId = Q.content.order.includes(raw.lastGameId) ? raw.lastGameId : null;
    return progress;
  };
  Q.core = { clone, clamp, stars, grade, attempt, next, hydrateBase, result, register, initialProgress, record, summary, validateProgress };
})(window.CDSCLearning = window.CDSCLearning || {});
