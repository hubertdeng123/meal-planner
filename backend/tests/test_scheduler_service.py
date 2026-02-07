from app.services.scheduler_service import SchedulerService


def test_scheduler_registers_hourly_reminder_check():
    service = SchedulerService()
    captured = {}

    def fake_add_job(*args, **kwargs):
        captured.update(kwargs)

    service.scheduler.add_job = fake_add_job
    service.scheduler.start = lambda: None

    service.start()

    assert captured["id"] == "weekly_reminder_check"
    trigger_repr = str(captured["trigger"])
    assert "minute='0'" in trigger_repr
    assert "hour='0'" not in trigger_repr
