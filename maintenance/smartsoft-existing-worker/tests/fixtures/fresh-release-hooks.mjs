function createFreshReleaseHooks({ hash, authenticate, balance, lockWallets,
  transaction, cash, publicGames, modelIdentity, fail, isAccepting }) {
  const id = 'fresh_multihot10';
  const subject = (request, userId) => {
    const raw = request.headers.get('cookie')?.match(/(?:^|;\s*)sw_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!raw) fail(401, 'PLAYER_LOGIN_REQUIRED');
    return hash('fresh-account-session-v1\0' + userId + '\0' + raw);
  };
  const currentGame = () => {
    const game = publicGames().find(game => game.id === id);
    if (!game) fail(503, 'FRESH_GAME_UNAVAILABLE');
    return { ...game, enabled: isAccepting() === true && game.freshReleaseReady === true };
  };
  async function activeLibrary(connection, userId) {
    const result = await connection.query("SELECT game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 1", [userId]);
    return result.rows[0]?.game_id ?? null;
  }
  async function roundOrder(connection, userId, roundId) {
    const result = await connection.query("SELECT settled_order FROM sw_rebuild.rounds WHERE id=$1 AND user_id=$2", ['nine:' + roundId, userId]);
    if (result.rowCount !== 1 || result.rows[0].settled_order === null || result.rows[0].settled_order === undefined) fail(503, 'FRESH_ROUND_ORDER_UNAVAILABLE');
    return result.rows[0].settled_order;
  }
  async function hasNewerRound(connection, userId, roundId) {
    const order = await roundOrder(connection, userId, roundId);
    const result = await connection.query('SELECT 1 FROM sw_rebuild.rounds WHERE user_id=$1 AND settled_order>$2::bigint LIMIT 1', [userId, String(order)]);
    return result.rowCount > 0;
  }
  return {
    sessionGuard: subject,
    assertEnabled() {
      if (!currentGame().enabled) fail(503, 'FRESH_RELEASE_NOT_ENABLED');
    },
    assertSession(request, userId, input) {
      if (typeof input.sessionGuard !== 'string' || !/^[a-f0-9]{64}$/.test(input.sessionGuard) || input.sessionGuard !== subject(request, userId)) fail(409, 'PLAYER_SESSION_CHANGED');
    },
    assertModel(input) {
      const expected = modelIdentity(id);
      if (!['mathVersion', 'engineVersion', 'mathSha256'].every(key => input[key] === expected[key])) fail(409, 'GAME_RULES_UPDATED_RELOAD');
    },
    async assertNoActive(connection, userId) {
      const active = await activeLibrary(connection, userId);
      if (active) fail(409, 'FINISH_ACTIVE_ROUND:' + active);
    },
    async assertLatest(connection, userId, roundId) {
      if (await hasNewerRound(connection, userId, roundId)) fail(409, 'GAMBLE_EXPIRED');
    },
    assertGambleState(input, attempt, stake) {
      if (input.replayOnly === true || !Number.isSafeInteger(input.expectedAttempt) || input.expectedAttempt !== attempt ||
        typeof input.expectedStake !== 'string' || input.expectedStake !== cash(stake)) fail(409, 'GAMBLE_STATE_CHANGED');
    },
    async assertPlayerCapacity(connection, userId, before, stake, maximumPayout) {
      const result = await connection.query('SELECT max_balance FROM sw_rebuild.account_limits WHERE user_id=$1', [userId]);
      const cap = result.rows[0]?.max_balance;
      if (cap !== null && cap !== undefined && BigInt(before) - BigInt(stake) + BigInt(maximumPayout) > BigInt(cap)) fail(409, 'ACCOUNT_BALANCE_LIMIT');
    },
    async state(request, userId) {
      return transaction(async connection => {
        await authenticate(request, connection, true);
        await lockWallets(connection, userId);
        const accountBalance = cash(await balance(connection, userId));
        const game = currentGame();
        const blockedByActiveGame = await activeLibrary(connection, userId);
        const latest = await connection.query("SELECT r.round_id,r.result_json,r.created_at,r.total_win FROM sw_nine.game_rounds r LEFT JOIN sw_rebuild.rounds c ON c.id='nine:'||r.round_id::text WHERE r.user_id=$1 AND r.game_id=$2 ORDER BY c.settled_order DESC NULLS LAST,r.created_at DESC,r.round_id DESC LIMIT 1", [userId, id]);
        let round = null;
        if (latest.rowCount) {
          const stored = latest.rows[0];
          const last = await connection.query("SELECT attempt,result_json FROM sw_nine.actions WHERE parent_id=$1 AND kind='GAMBLE' ORDER BY attempt DESC LIMIT 1", [stored.round_id]);
          const attempt = Number(last.rows[0]?.attempt ?? 0);
          const stake = last.rowCount ? last.rows[0].result_json.payout : cash(stored.total_win);
          let reason = null;
          if (!game.enabled) reason = 'FRESH_RELEASE_NOT_ENABLED';
          else if (blockedByActiveGame) reason = 'FINISH_ACTIVE_ROUND:' + blockedByActiveGame;
          else if (stake === '0.00') reason = 'NO_GAMBLE_WINNINGS';
          else if (attempt >= game.features.gambleRounds) reason = 'GAMBLE_LIMIT';
          else if (Number(stake) > Number(game.features.gambleMaxStake)) reason = 'GAMBLE_STAKE_LIMIT';
          else if (Date.now() - new Date(stored.created_at).getTime() > 600000 || await hasNewerRound(connection, userId, stored.round_id)) reason = 'GAMBLE_EXPIRED';
          round = { result: stored.result_json, createdAt: stored.created_at, gamble: {
            attempt, stake, available: reason === null, maxAttempts: game.features.gambleRounds,
            maxStake: game.features.gambleMaxStake, reason,
            ...(last.rowCount ? { lastResult: last.rows[0].result_json } : {})
          } };
        }
        return { authenticated: true, currency: 'ETB', sessionGuard: subject(request, userId),
          balance: accountBalance, game, round, blockedByActiveGame };
      });
    }
  };
}

