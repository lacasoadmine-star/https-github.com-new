# Owner's current construction scope

The owner changed the release plan to one complete 74-game package, and clarified that registration alone is insufficient: every game requires its actual, independently rebuilt frontend and working existing-account integration. Preserve the 74 original positions, including duplicate names, without substituting titles.

Do not launch additional AI agents or paid external AI services. Continue in the existing Codex Cloud workspace and retain source/research gathered earlier. Existing live game frontends remain outside the work scope. Financial API contracts can be read for integration, but account, database, balance and payout infrastructure remain unchanged.

The first two new frontends were deployed before the batching change. Their availability does not constitute completion of the 74-game package. The full registry remains a construction artifact until the corresponding frontends exist; do not publish placeholder cards as completed games.

The earlier API inventory covered `/api/slots/games` only. Native games use `/api/remaining20/state?game_id=…` and have additional models listed by `/api/config`. An earlier `GAME_NOT_FOUND` on a native ID under `/api/slots/games` was a transport mismatch, not proof the native model is missing. The internal-game API also has independent operator models and must not be confused with official game implementations.
