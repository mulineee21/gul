use std::process::Command;
use std::time::Duration;
use tauri::AppHandle;

pub fn send_desktop_notification(title: &str, body: &str) {
    let _ = Command::new("notify-send")
        .args([
            "-a", "OmniPkg",
            "-i", "system-software-update",
            title,
            body,
        ])
        .spawn();
}

pub fn start_background_update_monitor(_app: AppHandle) {
    tokio::spawn(async move {
        // Initial wait 30 seconds after startup
        tokio::time::sleep(Duration::from_secs(30)).await;

        loop {
            let updates = crate::updates::check_all_updates();
            if !updates.is_empty() {
                send_desktop_notification(
                    "Actualizaciones disponibles",
                    &format!(
                        "OmniPkg ha detectado {} paquete(s) con actualizaciones pendientes en tu sistema.",
                        updates.len()
                    ),
                );
            }

            // Check every 2 hours
            tokio::time::sleep(Duration::from_secs(7200)).await;
        }
    });
}
