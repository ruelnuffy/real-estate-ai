from .database import SessionLocal, engine, Base
from .models import Property

# Create tables
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    # Check if already seeded
    if db.query(Property).count() > 0:
        print("Database already seeded.")
        db.close()
        return

    properties = [
        Property(
            title="Modern 3-Bedroom Penthouse",
            description="Luxury penthouse with floor-to-ceiling windows and a private terrace overlooking the city skyline.",
            price=150000000.0,
            location="Victoria Island, Lagos",
            amenities="Pool, Gym, 24/7 Security, Elevator, Private Terrace"
        ),
        Property(
            title="Cozy 2-Bedroom Apartment",
            description="Perfect for young professionals, this apartment offers modern finishes and easy access to local amenities.",
            price=45000000.0,
            location="Lekki Phase 1, Lagos",
            amenities="Gated Community, Parking, Fitted Kitchen"
        ),
        Property(
            title="Executive 4-Bedroom Semi-Detached Duplex",
            description="Spacious duplex with premium fittings and a dedicated study room. Ideal for families.",
            price=120000000.0,
            location="Ikoyi, Lagos",
            amenities="Borehole, CCTV, 2-Car Parking, Boys Quarters"
        ),
        Property(
            title="Smart Studio Apartment",
            description="Compact and efficient studio with smart home features and high-speed internet connectivity.",
            price=25000000.0,
            location="Yaba, Lagos",
            amenities="High-speed Internet, Smart Locks, 24/7 Power"
        )
    ]
    db.add_all(properties)
    db.commit()
    print("Database seeded successfully.")
    db.close()

if __name__ == "__main__":
    seed_data()
