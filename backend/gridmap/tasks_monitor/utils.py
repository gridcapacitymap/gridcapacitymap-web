import json

from .schemas import CeleryTaskMetadata


def parse_task_meta_raw(raw_data: str):
    data = json.loads(raw_data)
    kwargs = data["result"] if type(data["result"]) is dict else {}
    kwargs["state"] = data["status"]
    kwargs["task_id"] = data["task_id"]
    if "exc_message" in kwargs:
        kwargs["state_reason"] = "\n".join(kwargs["exc_message"])
    return CeleryTaskMetadata(**kwargs)
