// utils/achievements.js
// Achievement checks — called after every game in updateStats().
// Stub in Phase 1: no-op, safe fallback.
// Phase 2: add real achievement unlock logic here.

/**
 * checkAchievements — evaluate stats and unlock achievements.
 * Currently a safe no-op. Called inside try/catch in storage.js.
 * @param {object} totalStats — total stats object from store
 */
export const checkAchievements = async (totalStats) => {
  if (!totalStats) return;
  // Phase 2 example:
  // if (totalStats.wins >= 10 && !store.player.achievements?.includes('wins_10')) {
  //   await unlockAchievement('wins_10');
  // }
};

export default { checkAchievements };