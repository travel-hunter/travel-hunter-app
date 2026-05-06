from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.data import seed
from app.db.session import get_session_factory
from app.models import (
    Policy,
    PolicyDocument,
    Recommendation,
    Trip,
    TripDay,
    TripInvite,
    TripMember,
    TripPlace,
    TripPolicy,
    User,
)


BENEFIT_AMOUNTS = {
    "local-vacation": 300000,
    "sokcho-stay": None,
    "busan-cashback": None,
}


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def parse_time(value: str | None) -> time | None:
    if not value:
        return None
    return time.fromisoformat(value)


def get_or_create_user(db: Session, *, email: str, nickname: str, **values: Any) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, nickname=nickname, **values)
        db.add(user)
        db.flush()
        return user

    user.nickname = nickname
    for key, value in values.items():
        setattr(user, key, value)
    return user


def seed_users(db: Session) -> dict[str, User]:
    main_user = get_or_create_user(
        db,
        email=str(seed.USER["email"]),
        nickname=str(seed.USER["nickname"]),
        password_hash=hash_password("password123"),
        birth_date=parse_date(str(seed.USER["birthDate"])),
        gender=seed.USER["gender"],
        region=seed.USER["region"],
        preferred_regions=seed.USER["preferredRegions"],
        residence_area=seed.USER["residenceArea"],
        travel_style=seed.PROFILE["style"],
        travel_budget=seed.PROFILE["budget"],
        onboarding_completed=bool(seed.USER["onboardingCompleted"]),
        created_at=parse_datetime(str(seed.USER["createdAt"])),
        updated_at=parse_datetime(str(seed.USER["updatedAt"])),
    )

    companions = {
        "민서": get_or_create_user(db, email="minseo@travel.kr", nickname="민서"),
        "현우": get_or_create_user(db, email="hyunwoo@travel.kr", nickname="현우"),
    }
    return {"지영": main_user, **companions}


def seed_policies(db: Session) -> dict[str, Policy]:
    policies: dict[str, Policy] = {}
    for item in seed.POLICIES:
        slug = str(item["slug"])
        policy = db.scalar(select(Policy).where(Policy.slug == slug))
        if policy is None:
            policy = Policy(slug=slug)
            db.add(policy)

        policy.title = str(item["title"])
        policy.organization = str(item["org"])
        policy.policy_type = str(item["category"])
        policy.description = str(item["summary"])
        policy.benefit_amount = BENEFIT_AMOUNTS[slug]
        policy.benefit_detail = str(item["amount"])
        policy.target_condition = "\n".join(str(value) for value in item["requirements"])
        policy.region = str(item["region"])
        policy.end_date = parse_date(str(item["deadline"]))
        policy.official_url = item.get("officialUrl")
        policy.policy_comment = str(item["summary"])
        policy.policy_period = f"~ {item['deadline']}"
        db.flush()

        existing_documents = {
            document.document_name: document for document in policy.documents
        }
        for document_name in item["documents"]:
            name = str(document_name)
            if name not in existing_documents:
                db.add(PolicyDocument(policy_id=policy.id, document_name=name))
        policies[slug] = policy

    db.flush()
    return policies


def get_or_create_trip(db: Session, owner: User) -> Trip:
    start_date = date(2026, 6, 15)
    trip = db.scalar(
        select(Trip).where(
            Trip.owner_id == owner.id,
            Trip.title == seed.TRIP["title"],
            Trip.start_date == start_date,
        )
    )
    if trip is None:
        trip = Trip(owner_id=owner.id, title=str(seed.TRIP["title"]), start_date=start_date)
        db.add(trip)

    trip.end_date = date(2026, 6, 17)
    trip.region = "제주"
    trip.description = "휴식 중심 여행"
    db.flush()
    return trip


def seed_trip_days_and_places(db: Session, trip: Trip) -> None:
    start_date = trip.start_date
    for day_number, places in seed.TRIP["days"].items():
        trip_day_date = start_date + timedelta(days=int(day_number) - 1)
        trip_day = db.scalar(
            select(TripDay).where(
                TripDay.trip_id == trip.id,
                TripDay.day_number == int(day_number),
            )
        )
        if trip_day is None:
            trip_day = TripDay(
                trip_id=trip.id,
                day_number=int(day_number),
                date=trip_day_date,
            )
            db.add(trip_day)
        else:
            trip_day.date = trip_day_date
        db.flush()

        for order_num, place in enumerate(places, start=1):
            place_name = str(place["label"])
            trip_place = db.scalar(
                select(TripPlace).where(
                    TripPlace.trip_day_id == trip_day.id,
                    TripPlace.order_num == order_num,
                )
            )
            if trip_place is None:
                trip_place = TripPlace(trip_day_id=trip_day.id, order_num=order_num)
                db.add(trip_place)

            trip_place.place_name = place_name
            trip_place.visit_time = parse_time(str(place["time"]))
            trip_place.memo = str(place["meta"])


def seed_trip_members(db: Session, trip: Trip, users_by_name: dict[str, User]) -> None:
    for person in seed.TRIP["people"]:
        user = users_by_name[str(person)]
        membership = db.scalar(
            select(TripMember).where(
                TripMember.trip_id == trip.id,
                TripMember.user_id == user.id,
            )
        )
        if membership is None:
            membership = TripMember(trip_id=trip.id, user_id=user.id)
            db.add(membership)
        membership.role = "owner" if user.id == trip.owner_id else "editor"


def seed_trip_policy(db: Session, trip: Trip, policy: Policy) -> None:
    existing = db.scalar(
        select(TripPolicy).where(
            TripPolicy.trip_id == trip.id,
            TripPolicy.policy_id == policy.id,
        )
    )
    if existing is None:
        db.add(TripPolicy(trip_id=trip.id, policy_id=policy.id))


def seed_trip_invite(db: Session, trip: Trip, creator: User) -> None:
    invite = db.scalar(
        select(TripInvite).where(TripInvite.invite_token == seed.INVITE_TOKEN)
    )
    if invite is None:
        invite = TripInvite(invite_token=seed.INVITE_TOKEN)
        db.add(invite)

    invite.trip_id = trip.id
    invite.created_by = creator.id
    invite.accepted_at = None
    invite.created_at = parse_datetime(seed.INVITE_CREATED_AT)
    invite.expires_at = parse_datetime(seed.INVITE_EXPIRES_AT)


def seed_recommendations(db: Session, user: User, trip: Trip) -> None:
    query = "제주 3일 여행 추천"
    recommendation = db.scalar(
        select(Recommendation).where(
            Recommendation.user_id == user.id,
            Recommendation.trip_id == trip.id,
            Recommendation.query == query,
        )
    )
    if recommendation is None:
        recommendation = Recommendation(user_id=user.id, trip_id=trip.id, query=query)
        db.add(recommendation)
    recommendation.result = seed.RECOMMENDATIONS


def seed_dev_data(db: Session) -> None:
    users_by_name = seed_users(db)
    policies = seed_policies(db)
    trip = get_or_create_trip(db, users_by_name["지영"])
    seed_trip_days_and_places(db, trip)
    seed_trip_members(db, trip, users_by_name)
    seed_trip_policy(db, trip, policies["local-vacation"])
    seed_trip_invite(db, trip, users_by_name["지영"])
    seed_recommendations(db, users_by_name["지영"], trip)


def main() -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        seed_dev_data(db)
        db.commit()
    print("Travel Hunter development seed data applied.")


if __name__ == "__main__":
    main()
