use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

pub fn send_desktop_notification(title: &str, body: &str) {
    let _ = Command::new("notify-send")
        .args([
            "-a", "GUL",
            "-i", "system-software-update",
            title,
            body,
        ])
        .spawn();
}

pub fn start_background_update_monitor(_app: AppHandle) {
    let _ = thread::Builder::new()
        .name("omnipkg-update-monitor".into())
        .spawn(move || {
            // Initial wait 30 seconds after startup so it doesn't collide with app launch
            thread::sleep(Duration::from_secs(30));

            loop {
                let updates = crate::updates::check_all_updates();
                if !updates.is_empty() {
                    send_desktop_notification(
                        "Actualizaciones disponibles",
                        &format!(
                            "GUL ha detectado {} paquete(s) con actualizaciones pendientes en tu sistema.",
                            updates.len()
                        ),
                    );
                }

                // Check every 2 hours
                thread::sleep(Duration::from_secs(7200));
            }
        });
}
