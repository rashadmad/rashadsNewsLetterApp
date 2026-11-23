export async function sendEmail({ db, id, getRecipients, mailer }) {
  const claimed = db
    .prepare("UPDATE emails SET status='sending' WHERE id=? AND status IN ('draft','scheduled')")
    .run(id);
  if (!claimed.changes) return { sent: 0, failed: 0, skipped: true };
  const email = db.prepare("SELECT * FROM emails WHERE id=?").get(id);
  const log = db.prepare("INSERT INTO send_log (email_id, recipient, ok, error) VALUES (?,?,?,?)");
  let sent = 0, failed = 0;
  try {
    for (const to of await getRecipients()) {
      try {
        await mailer({ to, subject: email.subject, html: email.body_html });
        log.run(id, to, 1, null);
        sent++;
      } catch (e) {
        log.run(id, to, 0, String(e.message));
        failed++;
      }
    }
  } catch (e) {
    db.prepare("UPDATE emails SET status='failed' WHERE id=?").run(id);
    throw e;
  }
  db.prepare("UPDATE emails SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
  return { sent, failed };
}

export function startScheduler({ db, getRecipients, mailer, intervalMs = 60_000 }) {
  const tick = async () => {
    const due = db
      .prepare("SELECT id FROM emails WHERE status='scheduled' AND scheduled_at <= ?")
      .all(new Date().toISOString());
    for (const { id } of due) {
      await sendEmail({ db, id: id, getRecipients, mailer }).catch((e) => console.error(e));
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return { tick, stop: () => clearInterval(timer) };
}
