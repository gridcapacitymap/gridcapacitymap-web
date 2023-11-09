import asyncio


class Hub:
    def __init__(self):
        self.subscriptions = set()

    def publish(self, message):
        for queue in self.subscriptions:
            queue.put_nowait(message)


hub = Hub()


class Subscription:
    def __init__(self, hub):
        self.hub = hub
        self.queue = asyncio.Queue()

    def __enter__(self):
        hub.subscriptions.add(self.queue)
        return self.queue

    def __exit__(self, type, value, traceback):
        hub.subscriptions.remove(self.queue)
