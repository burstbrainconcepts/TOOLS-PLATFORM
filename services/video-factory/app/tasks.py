from celery import Celery
from app.config import REDIS_URL
from app.render import render

celery_app = Celery(
    "video_factory",
    broker=REDIS_URL,
    backend=REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

@celery_app.task(bind=True, name="video_factory.render")
def render_video(self, manifest: dict):
    def report(progress: int, stage: str):
        self.update_state(state="PROGRESS", meta={"progress": progress, "stage": stage})
    return render(manifest, job_id=self.request.id, progress=report)
