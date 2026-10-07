"""Business actions. Every portal calls these; none keeps its own ledger."""

from __future__ import annotations

import secrets
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.core.ledger import LedgerError, admin_ids, audit, balance_of, money, notify, transfer, user_id
from app.core.models import (
    CasinoGame,
    CasinoRound,
    GameLaunch,
    Deposit,
    Provider,
    Setting,
    SportBet,
    SportEvent,
    User,
    Wallet,
    Withdrawal,
)


def run(work):
    db = SessionLocal()
    try:
        result = work(db)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except LedgerError as exc:
        db.rollback()
        raise HTTPException(status_code=exc.status, detail=exc.code) from exc
    finally:
        db.close()


def dec_str(value: object) -> str:
    return format(money(value), "f")


def _targets_for_player(db: Session, player: User) -> list[tuple[str, int]]:
    targets = [("player", player.id)]
    if player.agent_id:
        targets.append(("agent", player.agent_id))
    targets.extend(("admin", admin_id) for admin_id in admin_ids(db))
    return targets


def _event(kind: str, title: str, body: str, **extra) -> dict:
    payload = {"type": kind, "title": title, "body": body}
    payload.update(extra)
    return payload


def _finish(body: dict, targets: list[tuple[str, int]], event: dict | None) -> dict:
    return {"body": body, "targets": targets, "event": event}


def deposit(user_id_value: int, amount: Decimal, client_reference: str | None) -> dict:
    reference = "deposit:" + (client_reference or secrets.token_hex(8))

    def work(db: Session):
        existing = db.query(Deposit).filter(Deposit.reference == reference).one_or_none()
        player = db.get(User, user_id_value)
        if player is None:
            raise HTTPException(status_code=404, detail="Ciyaartoyga lama helin.")
        if existing is not None:
            return _finish(
                {"status": "OK", "balance": dec_str(balance_of(db, player.id)), "reference": reference},
                [],
                None,
            )
        agent_id = player.agent_id
        username = player.username
        transfer(
            db,
            user_id(db, "clearing"),
            player.id,
            amount,
            "deposit",
            reference,
            allow_negative_debit=True,
        )
        db.add(Deposit(user_id=player.id, agent_id=agent_id, amount=money(amount), reference=reference))
        title = "Deposit posted"
        body = f"{username} deposited {dec_str(amount)}"
        targets = _targets_for_player(db, player)
        for portal, account in targets:
            notify(db, account, "deposit", title, body)
        audit(db, player.id, "deposit", body)
        return _finish(
            {"status": "OK", "balance": dec_str(balance_of(db, player.id)), "reference": reference},
            targets,
            _event("deposit", title, body, username=username, amount=dec_str(amount)),
        )

    return run(work)


def request_withdrawal(user_id_value: int, amount: Decimal, client_reference: str | None) -> dict:
    reference = "withdraw:" + (client_reference or secrets.token_hex(8))

    def work(db: Session):
        existing = db.query(Withdrawal).filter(Withdrawal.reference == reference).one_or_none()
        player = db.get(User, user_id_value)
        if player is None:
            raise HTTPException(status_code=404, detail="Ciyaartoyga lama helin.")
        if existing is not None:
            return _finish(
                {"status": existing.status, "balance": dec_str(balance_of(db, player.id)), "id": existing.id},
                [],
                None,
            )
        transfer(db, player.id, user_id(db, "escrow"), amount, "withdraw_hold", reference + ":hold")
        row = Withdrawal(
            user_id=player.id,
            agent_id=player.agent_id,
            amount=money(amount),
            status="pending",
            reference=reference,
        )
        db.add(row)
        db.flush()
        title = "Withdrawal requested"
        body = f"{player.username} requested {dec_str(amount)}"
        targets = _targets_for_player(db, player)
        for _portal, account in targets:
            notify(db, account, "withdrawal", title, body)
        audit(db, player.id, "withdrawal.request", body)
        return _finish(
            {"status": "pending", "id": row.id, "balance": dec_str(balance_of(db, player.id))},
            targets,
            _event("withdrawal", title, body, username=player.username, amount=dec_str(amount)),
        )

    return run(work)


def decide_withdrawal(actor_id: int, withdrawal_id: int, approve: bool) -> dict:
    def work(db: Session):
        row = db.get(Withdrawal, withdrawal_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Codsiga lama helin.")
        if row.status != "pending":
            raise HTTPException(status_code=409, detail="Codsiga horey ayaa loo go'aamiyay.")
        player = db.get(User, row.user_id)
        if approve:
            transfer(
                db,
                user_id(db, "escrow"),
                user_id(db, "clearing"),
                Decimal(row.amount),
                "withdraw_paid",
                row.reference + ":paid",
            )
            row.status = "approved"
            title = "Withdrawal approved"
        else:
            transfer(
                db,
                user_id(db, "escrow"),
                row.user_id,
                Decimal(row.amount),
                "withdraw_release",
                row.reference + ":release",
            )
            row.status = "rejected"
            title = "Withdrawal rejected"
        body = f"{player.username} withdrawal {row.status} {dec_str(row.amount)}"
        targets = _targets_for_player(db, player)
        for _portal, account in targets:
            notify(db, account, "withdrawal", title, body)
        audit(db, actor_id, "withdrawal." + row.status, body)
        return _finish(
            {"status": row.status, "id": row.id, "balance": dec_str(balance_of(db, player.id))},
            targets,
            _event("withdrawal", title, body, username=player.username, amount=dec_str(row.amount)),
        )

    return run(work)


def place_sports_bet(user_id_value: int, event_id: int, selection: str, stake: Decimal) -> dict:
    def work(db: Session):
        event = db.get(SportEvent, event_id)
        if event is None or event.status != "open":
            raise HTTPException(status_code=409, detail="Ciyaarta lama furin.")
        if selection not in {"home", "away", "draw"}:
            raise HTTPException(status_code=400, detail="Xulashada khaldan.")
        odds = {"home": event.odds_home, "away": event.odds_away, "draw": event.odds_draw}[selection]
        player = db.get(User, user_id_value)
        reference = "sports-bet:" + secrets.token_hex(8)
        transfer(db, player.id, user_id(db, "house"), stake, "sports_bet", reference)
        bet = SportBet(
            user_id=player.id,
            event_id=event.id,
            selection=selection,
            stake=money(stake),
            odds=money(odds),
            status="open",
            reference=reference,
        )
        db.add(bet)
        db.flush()
        title = "Sports bet accepted"
        body = f"{player.username} staked {dec_str(stake)} on {event.name}"
        targets = _targets_for_player(db, player)
        for _portal, account in targets:
            notify(db, account, "sports", title, body)
        audit(db, player.id, "sports.bet", body)
        return _finish(
            {
                "status": "open",
                "id": bet.id,
                "odds": dec_str(odds),
                "balance": dec_str(balance_of(db, player.id)),
            },
            targets,
            _event("sports", title, body, username=player.username, amount=dec_str(stake)),
        )

    return run(work)


def settle_event(actor_id: int, event_id: int, result: str) -> dict:
    def work(db: Session):
        event = db.get(SportEvent, event_id)
        if event is None:
            raise HTTPException(status_code=404, detail="Ciyaarta lama helin.")
        if event.status != "open":
            raise HTTPException(status_code=409, detail="Ciyaarta horey ayaa loo xiray.")
        if result not in {"home", "away", "draw"}:
            raise HTTPException(status_code=400, detail="Natiijada khaldan.")
        rate = money(db.get(Setting, "commission_rate").value)
        house = user_id(db, "house")
        bets = db.query(SportBet).filter(SportBet.event_id == event.id, SportBet.status == "open").all()
        winners = 0
        for bet in bets:
            player = db.get(User, bet.user_id)
            if bet.selection == result:
                payout = money(Decimal(bet.stake) * Decimal(bet.odds))
                transfer(db, house, player.id, payout, "sports_win", f"sports-win:{bet.id}")
                bet.status = "won"
                winners += 1
                title = "Sports bet won"
                body = f"{player.username} won {dec_str(payout)} on {event.name}"
            else:
                bet.status = "lost"
                title = "Sports bet lost"
                body = f"{player.username} lost {dec_str(bet.stake)} on {event.name}"
                commission = money(Decimal(bet.stake) * rate)
                if commission > 0 and player.agent_id:
                    transfer(
                        db,
                        house,
                        player.agent_id,
                        commission,
                        "commission",
                        f"commission:{bet.id}",
                    )
                    notify(
                        db,
                        player.agent_id,
                        "commission",
                        "Commission earned",
                        f"Commission {dec_str(commission)} from {player.username}",
                    )
            targets = _targets_for_player(db, player)
            for _portal, account in targets:
                notify(db, account, "sports", title, body)
        event.status = "settled"
        event.result = result
        detail = f"{event.name} settled {result}"
        audit(db, actor_id, "sports.settle", detail)
        admins = [("admin", admin_id) for admin_id in admin_ids(db)]
        return _finish(
            {"status": "settled", "result": result, "winners": winners},
            admins,
            _event("sports", "Event settled", detail, result=result),
        )

    return run(work)


def play_casino(user_id_value: int, game_code: str, stake: Decimal) -> dict:
    def work(db: Session):
        game = db.query(CasinoGame).filter(CasinoGame.code == game_code).one_or_none()
        if game is None:
            raise HTTPException(status_code=404, detail="Ciyaarta casino lama helin.")
        player = db.get(User, user_id_value)
        house = user_id(db, "house")
        reference = "casino:" + secrets.token_hex(8)
        transfer(db, player.id, house, stake, "casino_bet", reference + ":bet")
        if game.kind == "fixed":
            payout = money(Decimal(stake) * Decimal(2))
        else:
            payout = money(Decimal(stake) * Decimal(2)) if secrets.randbelow(2) == 0 else money(0)
        if payout > 0:
            transfer(db, house, player.id, payout, "casino_win", reference + ":win")
        db.add(
            CasinoRound(
                user_id=player.id,
                game_code=game.code,
                stake=money(stake),
                payout=payout,
                reference=reference,
            )
        )
        title = "Casino round"
        body = f"{player.username} played {game.name} stake {dec_str(stake)} payout {dec_str(payout)}"
        targets = _targets_for_player(db, player)
        for _portal, account in targets:
            notify(db, account, "casino", title, body)
        audit(db, player.id, "casino.play", body)
        return _finish(
            {
                "status": "closed",
                "game": game.code,
                "stake": dec_str(stake),
                "payout": dec_str(payout),
                "balance": dec_str(balance_of(db, player.id)),
            },
            targets,
            _event("casino", title, body, username=player.username, amount=dec_str(payout)),
        )

    return run(work)


def launch_game(user_id_value: int, game_code: str) -> dict:
    """Open a local game session. The launch URL stays on this host."""

    def work(db: Session):
        game = db.query(CasinoGame).filter(CasinoGame.code == game_code).one_or_none()
        if game is None:
            raise HTTPException(status_code=404, detail="Ciyaarta casino lama helin.")
        session_id = secrets.token_urlsafe(18)
        db.add(GameLaunch(id=session_id, user_id=user_id_value, game_code=game.code))
        audit(db, user_id_value, "casino.launch", f"{game.code} {session_id}")
        return _finish(
            {
                "session_id": session_id,
                "game_code": game.code,
                "launch_url": f"/player/casino?session={session_id}",
            },
            [],
            None,
        )

    return run(work)


def apply_casino_webhook(session_id: str, transaction_id: str, action: str, amount: Decimal) -> dict:
    """Apply one signed BET or WIN. A repeated transaction id does not move funds again."""

    def work(db: Session):
        launch = db.get(GameLaunch, session_id)
        if launch is None:
            raise HTTPException(status_code=404, detail="Session-ka lama helin.")
        player = db.get(User, launch.user_id)
        if player is None or player.role != "player":
            raise HTTPException(status_code=404, detail="Session-ka lama helin.")
        house = user_id(db, "house")
        kind = action.upper()
        reference = f"webhook:{transaction_id}:{kind}"
        if kind == "BET":
            applied = transfer(db, player.id, house, amount, "casino_bet", reference)
        elif kind == "WIN":
            applied = transfer(db, house, player.id, amount, "casino_win", reference)
        else:
            raise HTTPException(status_code=400, detail="Nooca transaction-ka lama aqoonsan.")
        body = f"{player.username} {kind} {dec_str(amount)} {transaction_id}"
        targets = _targets_for_player(db, player)
        if applied:
            for _portal, account in targets:
                notify(db, account, "casino", "Casino webhook", body)
            audit(db, player.id, "casino.webhook", body)
        return _finish(
            {
                "status": "OK",
                "applied": applied,
                "action": kind,
                "transaction_id": transaction_id,
                "balance": dec_str(balance_of(db, player.id)),
            },
            targets if applied else [],
            _event("casino", "Casino webhook", body, username=player.username, amount=dec_str(amount))
            if applied
            else None,
        )

    return run(work)


def create_account(actor_id: int, username: str, email: str, password: str, role: str, agent_id, parent_agent_id):
    def work(db: Session):
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password-ku aad buu u gaaban yahay.")
        taken = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if taken is not None:
            raise HTTPException(status_code=409, detail="Account-kan waa jira.")
        tier = {"player": "player", "agent": "agent", "admin": "support"}.get(role, role)
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            tier=tier,
            agent_id=agent_id,
            parent_agent_id=parent_agent_id,
        )
        db.add(user)
        db.flush()
        db.add(Wallet(user_id=user.id, currency="USD", balance=Decimal("0")))
        audit(db, actor_id, "account.create", f"{role} {username}")
        targets = [("admin", admin_id) for admin_id in admin_ids(db)]
        if agent_id:
            targets.append(("agent", agent_id))
        title = "Account created"
        body = f"{role} {username} created"
        for _portal, account in targets:
            notify(db, account, "account", title, body)
        return _finish(
            {"id": user.id, "username": user.username, "role": user.role},
            targets,
            _event("account", title, body, username=username),
        )

    return run(work)


def update_profile(user_id_value: int, email: str) -> dict:
    def work(db: Session):
        user = db.get(User, user_id_value)
        taken = db.query(User).filter(User.email == email, User.id != user.id).first()
        if taken is not None:
            raise HTTPException(status_code=409, detail="Email-kan waa la isticmaalay.")
        user.email = email
        audit(db, user.id, "profile.update", email)
        return _finish({"email": user.email, "username": user.username}, [], None)

    return run(work)


def update_setting(actor_id: int, key: str, value: str) -> dict:
    def work(db: Session):
        if key != "commission_rate":
            raise HTTPException(status_code=400, detail="Dejintan lama beddeli karo.")
        rate = money(value)
        if rate < 0 or rate >= 1:
            raise HTTPException(status_code=400, detail="Commission-ku waa inuu u dhexeeyaa 0 iyo 1.")
        setting = db.get(Setting, key)
        setting.value = dec_str(rate)
        audit(db, actor_id, "settings.update", f"{key}={setting.value}")
        return _finish({"key": key, "value": setting.value}, [], None)

    return run(work)


def update_permission(actor_id: int, role: str, action: str, allowed: bool) -> dict:
    def work(db: Session):
        from app.core.models import Permission

        row = db.query(Permission).filter_by(role=role, action=action).one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Ogolaanshaha lama helin.")
        row.allowed = allowed
        audit(db, actor_id, "permissions.update", f"{role}:{action}={allowed}")
        return _finish({"role": role, "action": action, "allowed": allowed}, [], None)

    return run(work)


def add_provider(actor_id: int, name: str, kind: str) -> dict:
    def work(db: Session):
        if kind not in {"sports", "casino"}:
            raise HTTPException(status_code=400, detail="Nooca provider-ka khaldan.")
        if db.query(Provider).filter(Provider.name == name).first():
            raise HTTPException(status_code=409, detail="Provider-kan waa jira.")
        row = Provider(name=name, kind=kind, status="inactive")
        db.add(row)
        db.flush()
        audit(db, actor_id, "provider.create", f"{name} {kind} inactive")
        return _finish({"id": row.id, "name": row.name, "status": row.status}, [], None)

    return run(work)


def player_ids(db: Session, agent_id: int) -> list[int]:
    rows = db.execute(
        text("SELECT id FROM users WHERE role = 'player' AND agent_id = :agent_id"),
        {"agent_id": agent_id},
    ).fetchall()
    return [int(row[0]) for row in rows]


def dashboard_for(db: Session, user: User) -> dict:
    balance = dec_str(balance_of(db, user.id))
    if user.role == "player":
        open_bets = db.query(SportBet).filter(SportBet.user_id == user.id, SportBet.status == "open").count()
        from app.core.models import Notification

        unread = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.read.is_(False))
            .count()
        )
        return {"username": user.username, "balance": balance, "open_bets": open_bets, "unread": unread}
    if user.role == "agent":
        ids = player_ids(db, user.id)
        pending = db.query(Withdrawal).filter(Withdrawal.agent_id == user.id, Withdrawal.status == "pending").count()
        commission = db.execute(
            text(
                """
                SELECT COALESCE(SUM(amount), 0) FROM ledger_entries
                WHERE reason = 'commission' AND credit_user_id = :user_id
                """
            ),
            {"user_id": user.id},
        ).scalar()
        return {
            "username": user.username,
            "balance": balance,
            "players": len(ids),
            "pending_withdrawals": pending,
            "commission_total": dec_str(commission or 0),
        }
    players = db.query(User).filter(User.role == "player").count()
    agents = db.query(User).filter(User.role == "agent").count()
    pending = db.query(Withdrawal).filter(Withdrawal.status == "pending").count()
    house = dec_str(balance_of(db, user_id(db, "house")))
    open_events = db.query(SportEvent).filter(SportEvent.status == "open").count()
    return {
        "username": user.username,
        "players": players,
        "agents": agents,
        "pending_withdrawals": pending,
        "house_balance": house,
        "open_events": open_events,
        "balance": balance,
    }


def list_events(db: Session, live: bool) -> dict:
    rows = (
        db.query(SportEvent)
        .filter(SportEvent.is_live.is_(live))
        .order_by(SportEvent.id)
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "league": row.league,
                "is_live": bool(row.is_live),
                "status": row.status,
                "result": row.result,
                "odds": {
                    "home": dec_str(row.odds_home),
                    "away": dec_str(row.odds_away),
                    "draw": dec_str(row.odds_draw),
                },
            }
            for row in rows
        ]
    }


def list_bets(db: Session, user: User) -> dict:
    sports = db.query(SportBet).filter(SportBet.user_id == user.id).order_by(SportBet.id.desc()).all()
    rounds = db.query(CasinoRound).filter(CasinoRound.user_id == user.id).order_by(CasinoRound.id.desc()).all()
    return {
        "sports": [
            {
                "id": row.id,
                "event_id": row.event_id,
                "selection": row.selection,
                "stake": dec_str(row.stake),
                "odds": dec_str(row.odds),
                "status": row.status,
            }
            for row in sports
        ],
        "casino": [
            {
                "id": row.id,
                "game": row.game_code,
                "stake": dec_str(row.stake),
                "payout": dec_str(row.payout),
            }
            for row in rounds
        ],
    }


def wallet_view(db: Session, user: User) -> dict:
    rows = db.execute(
        text(
            """
            SELECT reason, amount, debit_user_id, credit_user_id, reference
            FROM ledger_entries
            WHERE debit_user_id = :user_id OR credit_user_id = :user_id
            ORDER BY created_at DESC
            """
        ),
        {"user_id": user.id},
    ).fetchall()
    return {
        "balance": dec_str(balance_of(db, user.id)),
        "items": [
            {
                "reason": row[0],
                "amount": dec_str(row[1]),
                "direction": "credit" if int(row[3]) == user.id else "debit",
                "reference": row[4],
            }
            for row in rows
        ],
    }


def notifications_for(db: Session, user: User) -> dict:
    from app.core.models import Notification

    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.id.desc())
        .all()
    )
    return {
        "items": [
            {"id": row.id, "kind": row.kind, "title": row.title, "body": row.body, "read": bool(row.read)}
            for row in rows
        ]
    }


def history_for(db: Session, user: User) -> dict:
    return {
        "deposits": _deposits(db, user_ids=[user.id]),
        "withdrawals": _withdrawals(db, user_ids=[user.id]),
        "bets": list_bets(db, user),
    }


def _user_map(db: Session, ids: list[int]) -> dict[int, str]:
    if not ids:
        return {}
    rows = db.query(User).filter(User.id.in_(ids)).all()
    return {row.id: row.username for row in rows}


def _deposits(db: Session, user_ids: list[int] | None = None, agent_id: int | None = None) -> list[dict]:
    query = db.query(Deposit)
    if user_ids is not None:
        query = query.filter(Deposit.user_id.in_(user_ids or [-1]))
    if agent_id is not None:
        query = query.filter(Deposit.agent_id == agent_id)
    rows = query.order_by(Deposit.id.desc()).all()
    names = _user_map(db, [row.user_id for row in rows])
    return [
        {
            "id": row.id,
            "username": names.get(row.user_id, ""),
            "amount": dec_str(row.amount),
            "reference": row.reference,
        }
        for row in rows
    ]


def _withdrawals(db: Session, user_ids: list[int] | None = None, agent_id: int | None = None) -> list[dict]:
    query = db.query(Withdrawal)
    if user_ids is not None:
        query = query.filter(Withdrawal.user_id.in_(user_ids or [-1]))
    if agent_id is not None:
        query = query.filter(Withdrawal.agent_id == agent_id)
    rows = query.order_by(Withdrawal.id.desc()).all()
    names = _user_map(db, [row.user_id for row in rows])
    return [
        {
            "id": row.id,
            "username": names.get(row.user_id, ""),
            "amount": dec_str(row.amount),
            "status": row.status,
        }
        for row in rows
    ]


def ledger_rows(db: Session, user_ids: list[int] | None = None) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT reason, amount, reference, debit_user_id, credit_user_id
            FROM ledger_entries
            ORDER BY created_at DESC
            """
        )
    ).fetchall()
    allowed = set(user_ids) if user_ids is not None else None
    items = []
    for row in rows:
        if allowed is not None and int(row[3]) not in allowed and int(row[4]) not in allowed:
            continue
        items.append(
            {
                "reason": row[0],
                "amount": dec_str(row[1]),
                "reference": row[2],
                "debit_user_id": int(row[3]),
                "credit_user_id": int(row[4]),
            }
        )
    return items


def commission_rows(db: Session, agent_id: int | None = None) -> list[dict]:
    params: dict = {}
    clause = "WHERE reason = 'commission'"
    if agent_id is not None:
        clause += " AND credit_user_id = :agent_id"
        params["agent_id"] = agent_id
    rows = db.execute(
        text(
            f"""
            SELECT amount, reference, credit_user_id
            FROM ledger_entries
            {clause}
            ORDER BY created_at DESC
            """
        ),
        params,
    ).fetchall()
    return [
        {"amount": dec_str(row[0]), "reference": row[1], "agent_id": row[2]}
        for row in rows
    ]


def users_by_role(db: Session, role: str) -> list[dict]:
    rows = db.query(User).filter(User.role == role).order_by(User.id).all()
    return [
        {
            "id": row.id,
            "username": row.username,
            "email": row.email,
            "agent_id": row.agent_id,
            "parent_agent_id": row.parent_agent_id,
            "balance": dec_str(balance_of(db, row.id)),
        }
        for row in rows
    ]


def sub_agents(db: Session, agent_id: int) -> list[dict]:
    rows = db.query(User).filter(User.role == "agent", User.parent_agent_id == agent_id).all()
    return [{"id": row.id, "username": row.username, "email": row.email} for row in rows]


def agent_report(db: Session, agent: User) -> dict:
    ids = player_ids(db, agent.id)
    deposits = _deposits(db, agent_id=agent.id)
    withdrawals = _withdrawals(db, agent_id=agent.id)
    bet_total = Decimal("0")
    if ids:
        stakes = db.query(SportBet).filter(SportBet.user_id.in_(ids)).all()
        bet_total = sum((money(row.stake) for row in stakes), Decimal("0"))
    return {
        "players": len(ids),
        "deposits": dec_str(sum((money(item["amount"]) for item in deposits), Decimal("0"))),
        "withdrawals": dec_str(sum((money(item["amount"]) for item in withdrawals), Decimal("0"))),
        "stakes": dec_str(bet_total),
        "commission": dashboard_for(db, agent)["commission_total"],
    }


def admin_report(db: Session) -> dict:
    deposit_total = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM deposits")).scalar()
    open_bets = db.query(SportBet).filter(SportBet.status == "open").count()
    return {
        "players": db.query(User).filter(User.role == "player").count(),
        "agents": db.query(User).filter(User.role == "agent").count(),
        "deposits": dec_str(deposit_total or 0),
        "open_bets": open_bets,
        "house_balance": dec_str(balance_of(db, user_id(db, "house"))),
    }


def audit_rows(db: Session) -> list[dict]:
    from app.core.models import AuditLog

    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    return [{"id": row.id, "actor_id": row.actor_id, "action": row.action, "detail": row.detail} for row in rows]


def permission_rows(db: Session) -> list[dict]:
    from app.core.models import Permission

    rows = db.query(Permission).order_by(Permission.role, Permission.action).all()
    return [{"role": row.role, "action": row.action, "allowed": bool(row.allowed)} for row in rows]


def provider_rows(db: Session) -> list[dict]:
    rows = db.query(Provider).order_by(Provider.id).all()
    return [{"id": row.id, "name": row.name, "kind": row.kind, "status": row.status} for row in rows]


def casino_games(db: Session) -> dict:
    rows = db.query(CasinoGame).order_by(CasinoGame.id).all()
    return {"items": [{"code": row.code, "name": row.name, "kind": row.kind} for row in rows]}


def all_events(db: Session) -> dict:
    rows = db.query(SportEvent).order_by(SportEvent.id).all()
    return {
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "status": row.status,
                "result": row.result,
                "is_live": bool(row.is_live),
            }
            for row in rows
        ]
    }


def settings_view(db: Session) -> dict:
    rows = db.query(Setting).all()
    return {"items": [{"key": row.key, "value": row.value} for row in rows]}


def conservation(db: Session) -> str:
    total = db.execute(text("SELECT COALESCE(SUM(balance), 0) FROM wallets")).scalar()
    return dec_str(total or 0)
