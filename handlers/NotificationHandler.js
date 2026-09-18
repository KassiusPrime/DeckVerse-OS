export function createNotificationHandler(notificationService){return async event=>{if(typeof notificationService?.notify!=='function')return null;return notificationService.notify(event);};}
