FROM python:3.10-slim

ARG APP_VERSION
ARG APP_COMMIT

ENV APP_VERSION $APP_VERSION
ENV APP_COMMIT $APP_COMMIT

WORKDIR /app
COPY . /app

RUN pip3 install -r requirements.txt

CMD bash -c 'python -m gridmap.wait_for_db && alembic upgrade head && python -m uvicorn gridmap.main:app --host 0.0.0.0 --log-level=info'
