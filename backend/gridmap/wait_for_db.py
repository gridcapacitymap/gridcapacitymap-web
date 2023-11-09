import asyncio

import asyncpg

from .config import settings

retry_timeout = 3
loop = asyncio.get_event_loop()


async def wait_db_ready():
    db = settings.DATABASE_URL.split("/")[-1]
    db_exist = False

    while not db_exist:
        try:
            conn = await asyncpg.connect(
                dsn=settings.DATABASE_URL.replace("postgresql+asyncpg", "postgres"),
                loop=loop,
                timeout=30,
            )

            row = await conn.fetchrow(f"SELECT 1 FROM pg_database WHERE datname='{db}'")

            await conn.close()

            if row:
                print(f"database '{db}' is present.")
                db_exist = True
            else:
                print(f"database '{db}' not found. Retry in {retry_timeout}s...")

        except Exception as e:
            print(f"Error establishing connection to postgres: {e}")
        finally:
            if db_exist:
                break
            else:
                await asyncio.sleep(retry_timeout)


if __name__ == "__main__":
    loop.run_until_complete(wait_db_ready())
