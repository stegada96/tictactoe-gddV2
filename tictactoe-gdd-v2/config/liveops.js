// config/liveops.js — Chaos Week, stagione, daily challenge, bonus eventi

const liveops = {
  CHAOS_WEEK_ENABLED:    false,
  CHAOS_WEEK_MODES:      ['online'],
  CHAOS_WEEK_BONUS_ELO:  1.3,
  CHAOS_WEEK_BONUS_XP:   1.5,
  CHAOS_WEEK_RULES: [],

  DAILY_PASS_ENABLED:          true,
  DAILY_PASS_REWARD_CREDITS:   50,
  DAILY_PASS_REWARD_XP:        100,

  BEST_OF_3_ENABLED:           false,
  BEST_OF_3_TOTAL_MINUTES:      10,
  BEST_OF_3_COST_CREDITS:       20,
  BEST_OF_3_WIN_CREDITS:        80,
  BEST_OF_3_WIN_ELO_BONUS:     1.5,
  BEST_OF_3_VARIANTS_COUNT:      3,
};

export default liveops;